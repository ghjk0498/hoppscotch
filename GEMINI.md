# Hoppscotch Workspace

모노레포 구조의 패키지 맵 및 주요 로직 안내입니다. 상세 내용은 각 패키지 폴더의 `GEMINI.md`를 참조하세요.

## Package Map & Knowledge Base

| Package | Description | Key Knowledge / Logic |
| :--- | :--- | :--- |
| [common](./packages/hoppscotch-common/GEMINI.md) | UI & Shared Logic | Request Lifecycle, Test Runner, Variable 결합 순서 |
| [data](./packages/hoppscotch-data/GEMINI.md) | Data Schemas | `<< >>` 플레이스홀더 파싱, Verzod 스키마, 데이터 버전 관리 |
| [js-sandbox](./packages/hoppscotch-js-sandbox/GEMINI.md) | Script Sandbox | QuickJS 기반 스크립트 실행, `pw`/`pm` API 구현 |
| [kernel](./packages/hoppscotch-kernel) | Abstraction Layer | I/O, Network, Store 통합 인터페이스 |
| [relay](./packages/hoppscotch-relay) | Rust Proxy | CORS 우회, SSL/TLS 처리, 프록시 로직 |
| [backend](./packages/hoppscotch-backend) | NestJS Server | Auth, Workspaces, GraphQL API |
| [cli](./packages/hoppscotch-cli) | Runner CLI | CI/CD 환경에서의 컬렉션 실행 로직 |
| [desktop](./packages/hoppscotch-desktop) | Tauri App | 데스크톱 앱 전용 기능 (파일 시스템, 쿠키 등) |

## Core Knowledge: Variable Priority

러너(Runner) 실행 시 변수 우선순위는 다음과 같습니다 (상단일수록 우선):
1. **Iteration Data (임시 변수/데이터 파일)**: `initialEnvs.temp` (최상위 우선순위 적용됨)
2. **Request Variables**: 각 요청에 정의된 변수
3. **Collection Variables**: 컬렉션/폴더 상속 변수
4. **Environment Variables**: 선택된 환경 변수
5. **Global Variables**: 전역 변수

---

## Packages (Detailed)

- **codemirror-lang-graphql**: CodeMirror 6용 GraphQL 언어 지원 플러그인.
- **hoppscotch-agent**: Tauri V2 기반의 크로스 플랫폼 HTTP 요청 릴레이.
- **hoppscotch-backend**: NestJS기반의 백엔드 서비스.
- **hoppscotch-cli**: CI/CD 환경용 컬렉션 실행 도구.
- **hoppscotch-common**: 웹/데스크톱 공통 핵심 로직 및 UI.
- **hoppscotch-data**: 데이터 구조 정의 및 마이그레이션.
- **hoppscotch-desktop**: Tauri V2 데스크톱 앱.
- **hoppscotch-js-sandbox**: QuickJS 기반 스크립트 실행 환경.
- **hoppscotch-kernel**: 플랫폼별 구현체 사이의 추상화 계층.
- **hoppscotch-relay**: Rust 기반 고성능 HTTP 릴레이.
- **hoppscotch-selfhost-web**: 셀프 호스팅용 프론트엔드 배포판.
- **hoppscotch-sh-admin**: 셀프 호스팅 인스턴스 관리 대시보드.

---

## 🛠️ 지식 지도 유지보수 가이드

이 지식 지도는 프로젝트의 복잡한 로직을 빠르게 이해하기 위한 살아있는 문서입니다. 다음과 같은 상황 발생 시 반드시 업데이트를 수행해야 합니다:
- **새로운 핵심 로직 발견**: 이전에 파악되지 않았던 중요한 데이터 흐름이나 알고리즘을 발견했을 때.
- **아키텍처 변경**: 패키지 간의 의존 관계가 바뀌거나 새로운 추상화 계층이 도입되었을 때.
- **버그 수정 및 우선순위 조정**: 이번 변수 우선순위 수정과 같이 시스템의 동작 방식이 변경되었을 때.

각 패키지의 상세 구현 지도는 해당 패키지의 `GEMINI.md`에 기록하고, 루트 `GEMINI.md`는 이를 연결하는 인덱스 역할을 수행합니다.
