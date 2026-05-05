# Hoppscotch Workspace

이 프로젝트는 Hoppscotch의 모노레포 구조로, 다양한 플랫폼과 환경을 지원하는 패키지들로 구성되어 있습니다.

## Packages

`packages/` 폴더 아래의 각 패키지 역할은 다음과 같습니다:

- **codemirror-lang-graphql**: CodeMirror 6용 GraphQL 언어 지원 플러그인.
- **hoppscotch-agent**: Tauri V2 기반의 크로스 플랫폼 HTTP 요청 릴레이. 브라우저에서 제한된 커스텀 헤더, 인증서, 프록시, 로컬 네트워크 접근 기능을 제공하며 OTP를 통해 웹 앱과 인증된 통신을 수행합니다.
- **hoppscotch-backend**: NestJS기반의 백엔드 서비스. GraphQL API(Apollo), Prisma ORM을 사용하며 사용자 인증, 워크스페이스 관리 등을 담당합니다.
- **hoppscotch-cli**: CI/CD 환경에서 Hoppscotch 컬렉션을 실행하기 위한 도구. 프리-리퀘스트 스크립트 실행, 환경 변수 적용, 테스트 결과 리포팅(JUnit 등) 기능을 지원합니다.
- **hoppscotch-common**: Hoppscotch 웹 및 데스크톱 애플리케이션의 핵심 로직과 UI 컴포넌트가 포함된 공통 라이브러리.
- **hoppscotch-data**: Hoppscotch 데이터 구조(컬렉션, 환경 변수 등)를 정의하며 데이터 유효성 검사 및 버전 간 마이그레이션 로직을 포함합니다.
- **hoppscotch-desktop**: Tauri V2를 사용하여 구축된 데스크톱 앱. 클라우드 및 셀프 호스팅 인스턴스 연결을 지원하며 네이티브 환경의 이점을 활용합니다.
- **hoppscotch-js-sandbox**: QuickJS(via quickjs-emscripten)를 사용하여 보안이 중요한 외부 스크립트(테스트 및 프리-리퀘스트 스크립트)를 안전하게 실행하는 격리된 환경.
- **hoppscotch-kernel**: 어플리케이션 로직과 플랫폼별 구현체(웹, 데스크톱) 사이의 가교 역할을 하는 추상화 계층. I/O, 네트워크(Relay), 저장소(Store) 등에 대한 통합 인터페이스를 제공합니다.
- **hoppscotch-relay**: Rust로 작성된 고성능 HTTP 요청-응답 릴레이. Hoppscotch Agent 및 데스크톱에서 CORS 우회, SSL/TLS 세부 설정, 프록시 처리 등에 사용됩니다.
- **hoppscotch-selfhost-web**: 셀프 호스팅 환경을 위해 최적화된 Hoppscotch 프론트엔드 웹 배포판.
- **hoppscotch-sh-admin**: 셀프 호스팅 인스턴스의 사용자 및 시스템 설정을 관리하기 위한 어드민 대시보드.
