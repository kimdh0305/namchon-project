# -*- coding: utf-8 -*-
"""
설정 파일 (config.py)
---------------------
- BOOK_NAME_TO_ID : 좌측 상단에 찍힐 것으로 예상되는 "책 이름"(성경 66권) -> book_id 매핑.
  OCR 오탈자를 대비해 여러 표기(한글/약칭)를 등록해두고, 마지막엔 difflib 퍼지매칭으로 보정합니다.
- CROP 박스들은 "페이지 크기에 대한 비율(0~1)"로 정의합니다 (x0, y0, x1, y1).
  실제 스캔본의 여백/폭이 다를 수 있으므로 calibrate.py로 먼저 반드시 확인 후 조정하세요.
"""

# ---------------------------------------------------------------------------
# 1. 책 이름 매핑 (66권 전체) - sample writer_id 형식(genesis, matthew ...)의 book_id 와 동일
# ---------------------------------------------------------------------------
BOOK_NAME_TO_ID = {
    # 구약
    "창세기": "genesis", "창": "genesis",
    "출애굽기": "exodus", "출": "exodus",
    "레위기": "leviticus", "레": "leviticus",
    "민수기": "numbers", "민": "numbers",
    "신명기": "deuteronomy", "신": "deuteronomy",
    "여호수아": "joshua", "여호수아기": "joshua", "수": "joshua",
    "사사기": "judges", "사": "judges",
    "룻기": "ruth", "룻": "ruth",
    "사무엘상": "first-samuel", "삼상": "first-samuel",
    "사무엘하": "second-samuel", "삼하": "second-samuel",
    "열왕기상": "first-kings", "왕상": "first-kings",
    "열왕기하": "second-kings", "왕하": "second-kings",
    "역대상": "first-chronicles", "대상": "first-chronicles",
    "역대하": "second-chronicles", "대하": "second-chronicles",
    "에스라": "ezra", "스": "ezra",
    "느헤미야": "nehemiah", "느": "nehemiah",
    "에스더": "esther", "에": "esther",
    "욥기": "job", "욥": "job",
    "시편": "psalms", "시": "psalms",
    "잠언": "proverbs", "잠": "proverbs",
    "전도서": "ecclesiastes", "전": "ecclesiastes",
    "아가": "song-of-songs", "아가서": "song-of-songs", "아": "song-of-songs",
    "이사야": "isaiah", "이사야서": "isaiah", "사야": "isaiah",
    "예레미야": "jeremiah", "렘": "jeremiah",
    "예레미야애가": "lamentations", "애가": "lamentations", "애": "lamentations",
    "에스겔": "ezekiel", "겔": "ezekiel",
    "다니엘": "daniel", "단": "daniel",
    "호세아": "hosea", "호": "hosea",
    "요엘": "joel", "욜": "joel",
    "아모스": "amos", "암": "amos",
    "오바댜": "obadiah", "옵": "obadiah",
    "요나": "jonah", "욘": "jonah",
    "미가": "micah", "미": "micah",
    "나훔": "nahum", "나": "nahum",
    "하박국": "habakkuk", "합": "habakkuk",
    "스바냐": "zephaniah", "습": "zephaniah",
    "학개": "haggai", "학": "haggai",
    "스가랴": "zechariah", "슥": "zechariah",
    "말라기": "malachi", "말": "malachi",
    # 신약
    "마태복음": "matthew", "마태": "matthew", "마": "matthew",
    "마가복음": "mark", "마가": "mark", "막": "mark",
    "누가복음": "luke", "누가": "luke", "눅": "luke",
    "요한복음": "john", "요한": "john", "요": "john",
    "사도행전": "acts", "행": "acts",
    "로마서": "romans", "롬": "romans",
    "고린도전서": "first-corinthians", "고전": "first-corinthians",
    "고린도후서": "second-corinthians", "고후": "second-corinthians",
    "갈라디아서": "galatians", "갈": "galatians",
    "에베소서": "ephesians", "엡": "ephesians",
    "빌립보서": "philippians", "빌": "philippians",
    "골로새서": "colossians", "골": "colossians",
    "데살로니가전서": "first-thessalonians", "데전": "first-thessalonians",
    "데살로니가후서": "second-thessalonians", "데후": "second-thessalonians",
    "디모데전서": "first-timothy", "딤전": "first-timothy",
    "디모데후서": "second-timothy", "딤후": "second-timothy",
    "디도서": "titus", "딛": "titus",
    "빌레몬서": "philemon", "빌레몬": "philemon", "몬": "philemon",
    "히브리서": "hebrews", "히": "hebrews",
    "야고보서": "james", "약": "james",
    "베드로전서": "first-peter", "벧전": "first-peter",
    "베드로후서": "second-peter", "벧후": "second-peter",
    "요한일서": "first-john", "요일": "first-john",
    "요한이서": "second-john", "요이": "second-john",
    "요한삼서": "third-john", "요삼": "third-john",
    "유다서": "jude", "유다": "jude", "유": "jude",
    "요한계시록": "revelation", "계시록": "revelation", "계": "revelation",
}

# 정식 명칭만 모아둔 목록 (퍼지매칭 후보군으로 사용 - 짧은 약칭은 오매칭 위험이 있어 제외)
BOOK_FULL_NAMES = [
    "창세기", "출애굽기", "레위기", "민수기", "신명기", "여호수아", "사사기", "룻기",
    "사무엘상", "사무엘하", "열왕기상", "열왕기하", "역대상", "역대하", "에스라", "느헤미야",
    "에스더", "욥기", "시편", "잠언", "전도서", "아가", "이사야", "예레미야", "예레미야애가",
    "에스겔", "다니엘", "호세아", "요엘", "아모스", "오바댜", "요나", "미가", "나훔", "하박국",
    "스바냐", "학개", "스가랴", "말라기", "마태복음", "마가복음", "누가복음", "요한복음",
    "사도행전", "로마서", "고린도전서", "고린도후서", "갈라디아서", "에베소서", "빌립보서",
    "골로새서", "데살로니가전서", "데살로니가후서", "디모데전서", "디모데후서", "디도서",
    "빌레몬서", "히브리서", "야고보서", "베드로전서", "베드로후서", "요한일서", "요한이서",
    "요한삼서", "유다서", "요한계시록",
]

# ---------------------------------------------------------------------------
# 2. 크롭 박스 (페이지 대비 비율, x0,y0,x1,y1 / 0=좌상단, 1=우하단)
#    calibrate.py 로 실제 스캔본을 눈으로 보고 이 값을 조정하세요.
# ---------------------------------------------------------------------------
# 좌측 상단 "책 이름" 영역 - 페이지 폭의 좌측 40%, 높이의 상단 8% 정도로 가정
BOOK_TITLE_BOX = (0.00, 0.00, 0.55, 0.08)

# 하단 "소속 / 이름" 영역 - 페이지 폭 전체, 높이의 하단 10% 정도로 가정
FOOTER_BOX = (0.00, 0.90, 1.00, 1.00)

# 하단의 "이름" 라벨과 필기 칸만 포함하는 영역. 이름 OCR은 이 박스를 우선 사용합니다.
# 글씨가 칸 경계에 걸리거나 스캔이 기울어진 경우를 고려해 좌우/상하 여백을 포함합니다.
NAME_BOX = (0.34, 0.92, 0.57, 0.985)
# ---------------------------------------------------------------------------
# 3. OCR / 렌더링 설정
# ---------------------------------------------------------------------------
RENDER_DPI = 300          # 크롭 영역이 작은 글씨라 200~300 권장 (너무 높으면 1만 페이지 처리 시간 급증)
TESSERACT_LANG = "kor"      # 한국어만 인식 (영어 노이즈 혼입 방지)
TESSERACT_CONFIG_LINE = "--psm 7"   # 한 줄짜리 텍스트로 가정 (책이름/이름/소속 라인)

# 하단 라인에서 "소속"과 "이름"을 분리하는 방법.
#   "last_token"  : 마지막 공백 토큰을 이름으로, 나머지를 소속으로 간주 (기본값)
#   "regex"       : FOOTER_SPLIT_REGEX 로 그룹 캡처
FOOTER_SPLIT_MODE = "last_token"
FOOTER_SPLIT_REGEX = r"^(?P<group>.+?)\s+(?P<name>\S+)$"

# ---------------------------------------------------------------------------
# 4. 필사분배표(엑셀) 컬럼 자동 인식용 키워드
#    실제 헤더가 다르면 이 목록에 표현을 추가하세요 (여러 후보를 등록해두면
#    assignment_table.py 가 헤더 텍스트에 포함된 키워드로 컬럼을 자동 인식합니다).
# ---------------------------------------------------------------------------
ASSIGNMENT_COLUMN_KEYWORDS = {
    "name": ["이름", "성명", "성함", "필사자", "작성자", "name"],
    "group": ["소속", "지역", "교회", "부서", "그룹", "팀"],
    "book": ["책", "도서", "권", "성경", "book"],
    "from": ["시작", "from", "시작페이지", "start"],
    "to": ["끝", "to", "종료", "끝페이지", "end"],
    "page": ["페이지", "page", "쪽"],  # from/to가 없고 단일 페이지 컬럼만 있는 경우
    "chapter": ["장", "chapter"],
}

# 이름/소속 오탈자 보정 시, 이 값보다 유사도가 낮으면 "매칭 안 됨"으로 처리 (0~1)
ASSIGNMENT_NAME_FUZZY_CUTOFF = 0.0

TESSERACT_CMD_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# ---------------------------------------------------------------------------
# 5. 손글씨 인식용 비전 API 설정 (선택) - Tesseract 대신 시도해볼 수 있는 옵션들.
#    실제 footer 라인은 "소속 / 이름 / 직분" 3개 필드로 구성되어 있습니다.
#    API 키는 코드에 직접 넣지 말고 환경변수로 설정하세요 (vision_ocr.py 참고).
# ---------------------------------------------------------------------------
# FOOTER_FIELDS = [ "이름"]
NAME_FIELDS = ["이름"]

#GEMINI_MODEL = "gemini-flash-latest"   # 최신 Gemini Flash를 계속 가리키는 별칭
OPENAI_VISION_MODEL = "gpt-5.4-mini-global"   # 비용 효율적인 vision + 구조화 출력 모델

# 네이버 클로바 OCR (General) - 콘솔에서 도메인 생성 후 API Gateway 연동 시 발급됨
# (환경변수 NAVER_CLOVA_OCR_URL 로 설정하는 걸 권장, 여긴 비워둬도 됨)
#NAVER_CLOVA_OCR_URL = "http://clovaocr-api-kr.ncloud.com/external/v1/55611/ccbcebe592c1bfe9d35bc75ddef1103f5edb8e5c4f85c77d46d20fa490a95cb5"
#NAVER_CLOVA_OCR_SECRET="Q0lJcG9tVnhNRXJLZ0Rxd2hac2lYeEVub3hSZWRwUGI="
