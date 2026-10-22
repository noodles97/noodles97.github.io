# noodles97.github.io

개인 홈페이지(블로그 + 앱 모음). GitHub Pages가 Jekyll로 빌드하므로 로컬 설치가 필요 없습니다. 파일을 올리면 1~2분 뒤 https://noodles97.github.io/ 에 반영됩니다.

- **글 쓰기**: `_posts/YYYY-MM-DD-제목.md` 파일을 만들고 맨 위에 `title`(과 선택적으로 `tags`)을 적습니다. 본문은 마크다운입니다.
- **앱 추가**: `_data/apps.yml`에 `name`, `url`, `repo`, `description` 항목을 추가합니다. 앱은 `direct-import-calc/`, `image-converter/`처럼 폴더 하나에 정적 파일로 넣으면 `https://noodles97.github.io/폴더이름/`으로 그대로 서비스됩니다.
- **소개 문구와 사이트 이름**: `_config.yml`의 `title`, `description`.
- **디자인**: `assets/css/style.css`, 공통 뼈대는 `_layouts/default.html`.

## 영어 페이지

사이트는 한국어가 기본이고, 영어 페이지는 `/en/` 아래에 있습니다(`/en/`, `/en/blog/`, `/en/apps/`). 헤더 오른쪽의 `English` / `한국어` 링크로 오갑니다.

- **글의 영어판**: `_posts/en/` 안에 같은 형식으로 글을 만듭니다. 주소는 자동으로 `/en/blog/…`가 됩니다. 한국어 글과 영어 글의 맨 위에 같은 `ref: 아무이름`을 적어 두면 두 글이 서로 연결되어, 헤더의 언어 링크와 글 머리의 "Read in English / 한국어로 읽기" 링크가 짝 글로 갑니다. 영어판이 없는 글에서는 언어 링크가 영어 홈으로 갑니다. 영어 글만 모은 RSS는 `/feed/en.xml` 입니다.
- **앱 설명의 영어판**: `_data/apps.yml`에 `name_en`, `description_en`(그리고 영어 페이지가 따로 있으면 `url_en`)을 적습니다. 없으면 한국어 값이 그대로 보입니다.
- **메뉴·소개 문구 같은 공통 문자열**: `_data/i18n.yml`.
- **이미지 변환기**: 한국어 `/image-converter/`, 영어 `/image-converter/en/`. 화면은 `_includes/image-converter.html` 한 벌이고, 모든 문구(화면 글과 스크립트 안내문)는 `_data/image_converter.yml`에 두 언어로 들어 있습니다. 문구를 고칠 때는 이 파일만 고치면 되고, 화면 구조를 바꿀 때는 템플릿을 고칩니다. 직구 계산기와 우사기 번역기는 한국어만 있습니다.
