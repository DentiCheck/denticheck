# Denticheck API

치아 건강 체크 및 관리 플랫폼 Denticheck의 백엔드 API 서버입니다.

## 기술 스택

- Java 17
- Spring Boot 3.5.x
- Spring Data JPA + QueryDSL
- GraphQL
- PostgreSQL 15
- Flyway (DB Migration)
- Docker & Docker Compose

## 시작하기

### 환경 변수 설정

`.env.example` 파일을 `.env`로 복사하고 환경에 맞게 수정하세요.

### 프로젝트 실행

```bash
./gradlew bootRun
```

### Docker를 이용한 실행

```bash
docker-compose -f docker/docker-compose.local.yml up -d
```

### GraphQL 문서 제작

**1. Magidoc 문서 생성**

```bash
cd .\docs\magidoc
npx @magidoc/cli@latest generate
# Need to install the following packages:
# @magidoc/cli@6.3.0
# Ok to proceed? (y) y
```

**2. 생성된 ./docs 폴더를 Spring resources/static 아래로 복사**

현재 위치가 `api/docs/magidoc` 라고 가정

```powershell
# ROBOCOPY :: Windows용 견고한 파일 복사
robocopy .\docs ..\..\src\main\resources\static\docs\graphql /E
```

`/E` = 빈 폴더 포함 하위 폴더까지 복사

```bash
# Linux/MacOS용
rsync -a ./docs/ ../../src/main/resources/static/docs/graphql/
```

`./docs/` 처럼 **끝에 `/` 붙여야 내용만 복사**됨
