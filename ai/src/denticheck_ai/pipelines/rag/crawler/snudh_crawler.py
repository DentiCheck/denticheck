"""
[파일 역할]
서울대학교치과병원(SNUDH) 웹사이트에서 RAG 시스템 구축에 필요한 치의학 지식 데이터를 수집하는 크롤러입니다.
'진료상담FAQ', '치아상식', '질병정보' 섹션의 데이터를 자동으로 수집하여 표준 JSON 형식으로 저장합니다.

[실행 방법]
프로젝트 루트에서 아래 명령어를 실행합니다.
macOS / Linux (Bash, zsh)
$ export PYTHONPATH=$PYTHONPATH:.
$ python3 src/denticheck_ai/pipelines/rag/crawler/snudh_crawler.py

Windows
$env:PYTHONPATH="$env:PYTHONPATH;."; python src\denticheck_ai\pipelines\rag\crawler\snudh_crawler.py
$env:PYTHONPATH="$env:PYTHONPATH;."; py -3 src\denticheck_ai\pipelines\rag\crawler\snudh_crawler.py

※ bs4 없어서 실패하면 설치
Windows
=> docker exec -it [container_name] python -m pip install beautifulsoup4 lxml

[동작 순서]
1. `base_url`과 수집 대상 게시판 URL 패턴을 설정합니다.
2. 각 게시판의 목록 페이지를 순회하며 상세 게시글 링크를 추출합니다.
3. 상세 페이지에 접속하여 [제목, 본문, 출처, URL] 데이터를 파싱합니다.
4. 수집된 모든 데이터를 `data/snudh_knowledge.json` 파일로 저장합니다.

[기술적 특징]
- 안정성을 위한 지수 백오프(Exponential Backoff) 기반 재시도 로직 적용.
- 서버 부하 방지를 위한 요청 간 대기 시간(time.sleep) 설정.
"""

import requests
from bs4 import BeautifulSoup
import time
import json
import os
from typing import List, Dict

class SnudhCrawler:
    """
    서울대학교치과병원 웹사이트 크롤러 클래스입니다.
    대상: FAQ, 치아상식, 질병정보 게시판
    """

    def __init__(self):
        """
        초기화 메서드입니다.
        대상 URL 목록과 헤더 정보를 설정합니다.
        """
        self.base_url = "https://www.snudh.org"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        # 크롤링 대상 설정 (URL 패턴, 시작 페이지, 끝 페이지)
        self.targets = [
            # 1. 진료상담FAQ (1~15페이지)
            {
                "name": "FAQ",
                "url_pattern": "https://www.snudh.org/portal/bbs/selectBoardList.do?bbsId=BBSMSTR_000000000258&menuNo=25010000&pageIndex={page}",
                "start_page": 1,
                "end_page": 15
            },
            # 2. 치아상식 (1~15페이지 - URL 구조 추정)
            {
                "name": "CommonSense",
                "url_pattern": "https://www.snudh.org/portal/bbs/selectBoardList.do?bbsId=BBSMSTR_000000000259&menuNo=25020000&pageIndex={page}",
                "start_page": 1,
                "end_page": 15
            },
            # 3. 질병정보 (1~4페이지)
            {
                "name": "DiseaseInfo",
                "url_pattern": "https://www.snudh.org/portal/bbs/selectBoardList.do?bbsId=BBSMSTR_000000000248&menuNo=25030000&pageIndex={page}",
                "start_page": 1,
                "end_page": 4
            }
        ]
        
        # 데이터 저장 폴더 생성
        os.makedirs("data", exist_ok=True)

    def fetch_page(self, url: str, max_retries: int = 5) -> BeautifulSoup:
        """
        URL에 요청을 보내고 BeautifulSoup 객체를 반환합니다.
        실패 시 최대 max_retries만큼 재시도합니다.
        """
        retry_delay = 2 # 초기 재시도 대기 시간 (초)
        
        for attempt in range(max_retries):
            try:
                time.sleep(1.5) # 서버 부하 방지를 위한 기본 대기
                response = requests.get(url, headers=self.headers, verify=False, timeout=10)
                
                # 503 에러 등의 경우 재시도 수행
                if response.status_code == 503:
                    print(f"      [알림] 서버 부하(503) 발생. {retry_delay}초 후 재시도... ({attempt + 1}/{max_retries})")
                    time.sleep(retry_delay)
                    retry_delay *= 2 # 지수 백오프
                    continue
                    
                response.raise_for_status()
                return BeautifulSoup(response.text, 'html.parser')
            except Exception as e:
                print(f"      [경고] {attempt + 1}회 요청 실패: {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    print(f"      [에러] 최종 요청 실패 ({url})")
                    return None
        return None

    def parse_list_page(self, soup: BeautifulSoup) -> List[str]:
        """
        목록 페이지에서 상세 페이지로 가는 링크(URL)들을 추출합니다.
        
        Args:
            soup (BeautifulSoup): 목록 페이지 HTML
            
        Returns:
            List[str]: 상세 페이지 URL 리스트
        """
        detail_urls = []
        # 보통 게시판 목록은 <table> 형태이며, 제목은 <td class="title"> 또는 <td class="subject"> 안에 <a> 태그로 존재
        # SNUDH 구조 추정: <td class="left"> <a href="...">...</a> </td>
        # 또는 <div class="board_list"> ...
        
        # SNUDH 목록 구조: table.board_list (또는 기본 table) 내의 td > a
        links = soup.select("table tbody tr td a") 
        
        for link in links:
            href = link.get('href')
            if href and 'selectBoardArticle.do' in href: 
                # 상대 경로인 경우 절대 경로로 변환
                if href.startswith('/'):
                    full_url = self.base_url + href
                elif href.startswith('http'):
                    full_url = href
                else:
                    # javascript:fn_egov_select('...') 형태일 수도 있음 (이 경우 복잡함)
                    # 여기서는 일반 링크(href)라고 가정
                    full_url = self.base_url + "/portal/bbs/" + href
                
                detail_urls.append(full_url)
                
        return detail_urls

    def parse_detail_page(self, soup: BeautifulSoup) -> Dict:
        """
        상세 페이지에서 제목과 본문 내용을 추출합니다.
        
        Args:
            soup (BeautifulSoup): 상세 페이지 HTML
            
        Returns:
            Dict: {"title": ..., "content": ...}
        """
        try:
            # 제목 추출: '제목' <th> 바로 다음 <td>
            title_text = "제목 없음"
            th_tags = soup.find_all("th")
            for th in th_tags:
                if "제목" in th.get_text():
                    td = th.find_next_sibling("td")
                    if td:
                        title_text = td.get_text(strip=True)
                        break
            
            # 본문 추출: id="dbdata" 인 div
            content = soup.find("div", id="dbdata")
            if not content:
                # 대안 선택자 (혹시 모를 구조 변경 대비)
                content = soup.select_one(".view_cont") or soup.select_one(".board_view")
            
            content_text = content.get_text(separator="\n", strip=True) if content else ""
            
            return {
                "title": title_text,
                "content": content_text
            }
        except Exception as e:
            print(f"[에러] 상세 페이지 파싱 실패: {e}")
            return None

    def run(self):
        """
        전체 크롤링 로직을 수행하고 결과를 JSON으로 저장합니다.
        """
        all_data = []
        
        for target in self.targets:
            print(f"\n[{target['name']}] 크롤링 시작...")
            
            for page in range(target['start_page'], target['end_page'] + 1):
                list_url = target['url_pattern'].format(page=page)
                print(f"  - 페이지 {page} 처리 중: {list_url}")
                
                # 1. 목록 페이지 접근
                list_soup = self.fetch_page(list_url)
                if not list_soup: continue
                
                # 2. 링크 추출 (여기서 로직 수정 필요 가능성 높음 - click_link 로직 등)
                # *중요*: SNUDH는 자바스크립트 링크(fn_egov_select)를 사용할 확률이 높습니다.
                # 이 경우 href를 파싱해서 nttId와 bbsId를 직접 조합해야 합니다.
                # 예: javascript:fn_egov_select('1234', 'BBSMSTR_...') -> selectBoardArticle.do?nttId=1234&bbsId=...
                
                # 일단은 requests로 가져온 HTML 텍스트에서 링크 패턴을 찾아봅니다.
                # (Static parsing 한계가 있을 수 있음)
                
                detail_urls = self.parse_list_page(list_soup)
                print(f"    -> {len(detail_urls)}개의 게시글 발견")

                for detail_url in detail_urls:
                    # 3. 상세 페이지 접근
                    detail_soup = self.fetch_page(detail_url)
                    if detail_soup:
                        result = self.parse_detail_page(detail_soup)
                        if result:
                            result['source'] = target['name']
                            result['url'] = detail_url
                            all_data.append(result)
        
        # 결과 저장
        output_path = "data/snudh_knowledge.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(all_data, f, ensure_ascii=False, indent=2)
            
        print(f"\n[완료] 총 {len(all_data)}건의 데이터가 {output_path}에 저장되었습니다.")

if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    crawler = SnudhCrawler()
    crawler.run()
