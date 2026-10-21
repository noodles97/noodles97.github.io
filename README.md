# noodles97.github.io

개인 홈페이지(블로그 + 앱 모음). GitHub Pages가 Jekyll로 빌드하므로 로컬 설치가 필요 없습니다. 파일을 올리면 1~2분 뒤 https://noodles97.github.io/ 에 반영됩니다.

- **글 쓰기**: `_posts/YYYY-MM-DD-제목.md` 파일을 만들고 맨 위에 `title`(과 선택적으로 `tags`)을 적습니다. 본문은 마크다운입니다.
- **앱 추가**: `_data/apps.yml`에 `name`, `url`, `repo`, `description` 항목을 추가합니다. 이 저장소 안에 두는 앱은 `image-converter/`처럼 폴더 하나에 정적 파일로 넣으면 그대로 서비스됩니다.
- **소개 문구와 사이트 이름**: `_config.yml`의 `title`, `description`.
- **디자인**: `assets/css/style.css`, 공통 뼈대는 `_layouts/default.html`.
