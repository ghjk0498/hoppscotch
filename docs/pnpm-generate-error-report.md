# `pnpm generate` 오류 분석 및 디버깅 보고서

## 1. 개요
`pnpm generate` 명령 실행 시 `packages/hoppscotch-selfhost-web` 패키지의 빌드 과정에서 다음과 같은 런타임 오류가 발생하며 빌드가 중단되는 현상을 분석하였습니다.

**오류 메시지:**
`[vite-plugin-pwa:build] Could not load virtual:vite-plugin-pages/generated-pages?id=virtual:generated-pages: Cannot read properties of undefined (reading 'endsWith')`

## 2. 수행한 작업 및 의도 (Work & Intent)

### 2.1. 오류 재현 및 환경 확인
- **작업**: `pnpm.cmd generate`를 통해 오류를 로컬에서 재현.
- **의도**: PowerShell 실행 정책 문제로 `pnpm` 명령이 직접 실행되지 않는 환경을 우회하고, 정확한 오류 스택 트레이스를 확보하기 위함.

### 2.2. `VitePWA` 플러그인 격리 테스트
- **작업**: `vite.config.ts`에서 `VitePWA` 플러그인을 일시적으로 주석 처리.
- **의도**: 오류 메시지를 출력하는 주체인 `VitePWA`가 근본 원인인지, 아니면 다른 플러그인이 생성한 잘못된 데이터를 소비하고 있는 것인지 확인하기 위함.
- **결과**: `endsWith` 오류는 사라졌으나, PWA 관련 가상 모듈을 찾지 못하는 다른 오류가 발생. 이를 통해 `VitePWA`와 `Pages` 플러그인 간의 상호작용 중에 문제가 발생함을 확인.

### 2.3. 플러그인 순서 조정 및 별칭 변경
- **작업**: `VitePWA`를 플러그인 배열의 마지막으로 이동하고, `router.ts`에서 `virtual:generated-pages` 대신 `~pages` 별칭 사용.
- **의도**: Vite 플러그인 시스템에서 가상 모듈의 해소(resolution) 순서나 ID 형식이 영향을 주는지 테스트.
- **결과**: 동일한 오류가 발생하여 단순한 순서 문제는 아님을 확인.

### 2.4. Sitemap 생성 로직 분석
- **작업**: `Pages` 플러그인의 `onRoutesGenerated` 훅 내 `generateSitemap` 호출을 비활성화.
- **의도**: 경로(Route) 데이터가 생성된 직후 이를 가공하는 Sitemap 플러그인이 데이터 구조를 손상시키는지 확인.
- **결과**: **`endsWith` 오류가 사라짐.** 빌드가 진행되다가 Sitemap 파일 부재로 인한 `StaticCopy` 단계에서 멈춤.

## 3. 실패 원인 및 근본 원인 분석 (Root Cause Analysis)

### 3.1. 환경 변수 누락 (`VITE_BASE_URL`)
분석 결과, 프로젝트 루트에 `.env` 파일이 존재하지 않고 `.env.example`만 있는 상태였습니다. `vite.config.ts`에서는 `ENV.VITE_BASE_URL`을 Sitemap의 `hostname`으로 전달하고 있었습니다.

### 3.2. 실패 메커니즘
1. `VITE_BASE_URL`이 없어 `hostname`에 `undefined`가 전달됨.
2. `vite-plugin-pages-sitemap` 또는 `vite-plugin-pages`의 내부 로직이 `undefined`를 적절히 처리하지 못하고 경로 데이터를 오염시키거나 가상 모듈의 메타데이터를 비정상적으로 생성.
3. 이후 `VitePWA`가 빌드 단계에서 모든 모듈을 스캔하고 캐시할 파일을 결정하는 과정에서, 이 오염된 가상 모듈의 속성에 접근하려다 `endsWith` (문자열 메소드) 호출에 실패하며 크래시 발생.

## 4. 해결 제안
1. **환경 설정**: `.env` 파일을 생성하고 `VITE_BASE_URL`을 올바른 호스트 주소로 설정해야 합니다.
2. **코드 방어막**: `vite.config.ts`에서 `hostname` 전달 시 `ENV.VITE_BASE_URL || "http://localhost:3000"`와 같이 기본값을 제공하여 환경 변수가 누락되어도 빌드가 깨지지 않도록 보완해야 합니다.
