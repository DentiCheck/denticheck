# Docker Compose 로컬 관리 완벽 가이드

`docker-compose.local.yml` 파일을 사용하여 로컬 개발 환경을 운영할 때, **가장 핵심적인 3가지 명령어**입니다.

## ⚡ 1. 요약 (가장 많이 쓰는 것!)

### ✅ 최초 실행 & 업데이트 (Start & Update)

> 처음 프로젝트를 시작하거나, 코드를 수정했거나, 뭔가 이상해서 **다시 확실하게 켜고 싶을 때** 무조건 이 명령어를 쓰세요.

```bash
docker compose -f docker-compose.local.yml up -d --build
```

### ✅ 작업 끝내기 (Stop)

> 퇴근하거나 잠시 멈출 때 사용합니다. (데이터는 안전하게 유지됨)

```bash
docker compose -f docker-compose.local.yml stop
```

### ✅ 다시 시작하기 (Resume)

> 위에서 `stop`으로 멈춰둔 컨테이너를 다시 깨울 때 사용합니다. (가장 빠름)

```bash
docker compose -f docker-compose.local.yml start
```

---

## 🚀 2. 상황별 상세 가이드

### **상황 A: 코드 수정 시 (AI/API 개발 중)**

Python/Java 코드를 수정했을 때, 변경 사항을 반영하려면 컨테이너를 재시작하거나 다시 빌드해야 합니다.

**빠른 반영 (Restart)**
단순 코드 수정이 볼륨 마운트로 연결된 경우, 재시작만으로 충분할 수 있습니다.

```bash
docker compose -f docker-compose.local.yml restart ai api
```

**확실한 반영 (Rebuild)**
`Dockerfile`이 변경되었거나, 패키지 설치(`pip install`, `gradle build` 등)가 필요한 경우 이미지를 다시 빌드해야 합니다.

```bash
docker compose -f docker-compose.local.yml up -d --build --no-deps ai api
```

### **상황 B: 기반 이미지/버전 변경 시**

`docker-compose.local.yml`에서 `postgres:15` -> `postgres:16` 처럼 버전을 올렸거나, 팀원이 기반 이미지를 변경했을 때 사용합니다.

```bash
# 1. 새 이미지 가져오기
docker compose -f docker-compose.local.yml pull

# 2. 변경된 설정으로 컨테이너 교체 (데이터는 유지됨)
docker compose -f docker-compose.local.yml up -d
```

> `up -d`는 변경된 설정이 감지된 컨테이너만 지능적으로 재생성합니다.

### **상황 C: 컨테이너 환경 변수(.env) 변경 시**

환경 변수(DB 비밀번호, API 키 등)를 수정했다면, 컨테이너를 재생성해야 적용됩니다.

```bash
docker compose -f docker-compose.local.yml up -d
```

### **상황 D: 찜찜해서 싹 밀고 다시 하고 싶을 때 (초기화)**

DB 데이터 꼬임 등으로 초기화가 필요할 때 사용합니다. **주의: DB 데이터가 모두 날아갑니다!**

```bash
# 1. 컨테이너 + 볼륨(데이터)까지 모두 삭제
docker compose -f docker-compose.local.yml down -v

# 2. 깨끗한 상태로 다시 시작
docker compose -f docker-compose.local.yml up -d --build
```

---

## 🛑 3. 켜고 끄기 (일상적인 사용)

### **작업 시작할 때 (Start)**

**"그냥 다 한 번에 켜도 되나요?" -> 네, 됩니다!** 🙆‍♂️
Docker Compose가 `depends_on` 설정을 보고 알아서 순서대로 켜줍니다.

**방법 1: 멈췄던 거 깨우기 (Start)**
이미 생성된 컨테이너들을 다시 시작합니다. (빌드 없음, 가장 빠름)

```bash
docker compose -f docker-compose.local.yml start
```

**방법 2: 확실하게 켜기 (Up)**
혹시 죽은 컨테이너가 있거나 설정 변경이 있을 수 있으니 안전하게 켜는 방법입니다.

```bash
docker compose -f docker-compose.local.yml up -d
```

### **작업 끝낼 때 (Stop/Down)**

**방법 1: 잠시 멈춤 (Stop)** - 추천 👍
컨테이너를 정지시킵니다. CPU/메모리 자원을 반환하지만, 컨테이너 자체는 남아있어 다음 시작이 매우 빠릅니다.

```bash
docker compose -f docker-compose.local.yml stop
```

**방법 2: 컨테이너 삭제 (Down)**
컨테이너와 네트워크를 완전히 제거합니다. 깔끔하지만 다음에 켤 때 시간이 조금 더 걸립니다.

```bash
docker compose -f docker-compose.local.yml down
```

> `down`을 해도 `-v` 옵션을 붙이지 않는 한 DB 데이터(Volume)는 안전하게 보존됩니다.

---

## 📊 4. 유용한 모니터링 명령어 모음

| 동작            | 명령어                                                          | 설명                                |
| :-------------- | :-------------------------------------------------------------- | :---------------------------------- |
| **상태 확인**   | `docker compose -f docker-compose.local.yml ps`                 | 어떤 컨테이너가 죽었는지(Exit) 확인 |
| **로그 보기**   | `docker compose -f docker-compose.local.yml logs -f [서비스명]` | 실시간 로그 확인 (Ctrl+C로 종료)    |
| **리소스 확인** | `docker stats`                                                  | CPU/메모리 점유율 실시간 확인       |
| **접속 하기**   | `docker exec -it [컨테이너명] /bin/bash`                        | 실행 중인 컨테이너 내부로 쉘 접속   |
