const tutorial = {
  showIntro() {
    const intro = document.getElementById("introScreen");
    if (intro) {
      intro.style.display = "flex";
      // 작은 지연 후 show 클래스 추가하여 transition 실행
      setTimeout(() => intro.classList.add("show"), 10);
      if (window.utils) utils.closeModal("settingModal");
    }
  },

  hideIntro() {
    const intro = document.getElementById("introScreen");
    if (intro) {
      intro.classList.remove("show");
      // 애니메이션 끝난 후 display none
      setTimeout(() => {
        intro.style.display = "none";
      }, 400);
    }
    localStorage.setItem("dj_tutorial_done", "true");
  },

  startFromIntro() {
    this.hideIntro();
    // 인트로가 완전히 사라진 후 튜토리얼을 시작하도록 충분한 지연시간
    setTimeout(() => {
      this.show();
    }, 600);
  },

  show() {
    const settingModal = document.getElementById("settingModal");
    if (settingModal && settingModal.classList.contains("show")) {
      // 튜토리얼을 모달 내에서 시작했을 경우 잔상 없이 즉시 닫기
      settingModal.style.transition = "none";
      settingModal.classList.remove("show");
      void settingModal.offsetHeight; // 강제 리플로우
      settingModal.style.transition = "";
    }
    if (window.utils) utils.closeModal("settingModal");

    // driver.js 객체 접근 방식 통일 및 로드 확인
    const driverLib = (window.driver && window.driver.js && window.driver.js.driver) ? window.driver.js.driver : (typeof window.driver === 'function' ? window.driver : null);

    if (!driverLib) {
      console.error("Tutorial Library (driver.js) not found.");
      return;
    }

    // 튜토리얼용 임시 데이터 ID 생성
    const dummyMemoId = "tut_memo_" + Date.now();
    const dummyNotiId = "tut_noti_" + Date.now();
    const dummyShortcutId = "tut_shortcut_" + Date.now();
    const dummyWeatherId = "tut_weather_" + Date.now();

    const syncDummyData = (state) => {
      // 날씨 임시 데이터 상태 관리 (상시 체크하여 없으면 튜토리얼용 임시 날씨 생성)
      if (window.weather && window.weather.locations) {
        const hasRealWeather = window.weather.showCurrent || window.weather.locations.some(l => !l.id.startsWith("tut_weather_"));
        
        if (state !== 'clear_all') {
          // 튜토리얼 중: 진짜 날씨가 없다면 가짜 날씨 추가
          if (!hasRealWeather && !window.weather.locations.find(l => l.id === dummyWeatherId)) {
            window.weather.locations.push({
              id: dummyWeatherId,
              name: "Seoul",
              lat: 37.5665,
              lon: 126.9780
            });
            window.weather.fetch();
          }
        } else {
          // 튜토리얼 종료/닫기: 가짜 날씨 삭제
          if (window.weather.locations.find(l => l.id === dummyWeatherId)) {
            window.weather.locations = window.weather.locations.filter(l => l.id !== dummyWeatherId);
            window.weather.fetch();
          }
        }
      }

      // 바로가기 임시 데이터 상태 관리
      if (state === 'shortcut') {
        if (window.shortcutMod && window.shortcutMod.items && !window.shortcutMod.items.find(s => s.name === ((window.i18n ? window.i18n.get("tutShortcutDummy") : "튜토리얼 바로가기") + " 1"))) {
          let targetCount = 8;
          const container = document.getElementById("shortcut-container");
          if (container) {
            const scaleStr = getComputedStyle(document.documentElement).getPropertyValue('--widget-scale') || "1";
            const scale = parseFloat(scaleStr);
            const rect = container.getBoundingClientRect();
            const absoluteTop = rect.top + window.scrollY;
            const threshold = window.innerHeight - 100;
            const availableHeight = (threshold - absoluteTop) / scale;
            
            const gap = 15;
            const itemHeight = 84;
            const itemWidth = 140;
            
            const computed = getComputedStyle(container);
            const pLeft = parseFloat(computed.paddingLeft) || 0;
            const pRight = parseFloat(computed.paddingRight) || 0;
            const innerWidth = (rect.width / scale) - pLeft - pRight;
            
            const rows = Math.max(1, Math.floor((availableHeight + gap) / (itemHeight + gap)));
            const cols = Math.max(1, Math.floor((innerWidth + gap) / (itemWidth + gap)));
            
            targetCount = (rows * cols) - window.shortcutMod.items.length;
            // 1줄 리스트로 넘어가는 경계값에서 약간 여유를 둬서 그리드 유지 보장
            targetCount = Math.max(1, targetCount - 1); 
            // 너무 많이 생성되는 것 방지
            targetCount = Math.min(20, targetCount);
          }

          for (let i = 1; i <= targetCount; i++) {
            window.shortcutMod.items.push({ name: `${window.i18n ? window.i18n.get("tutShortcutDummy") : "튜토리얼 바로가기"} ${i}`, url: `https://example.com/${i}`, _isTutorial: true });
          }
          window.shortcuts = window.shortcutMod.items;
          if (window.renderShortcuts) window.renderShortcuts();
          if (window.shortcutMod.checkLayout) window.shortcutMod.checkLayout();
        }
      } else if (state === 'none' || state === 'clear_all' || state === 'memo' || state === 'noti') {
        if (window.shortcutMod && window.shortcutMod.items && window.shortcutMod.items.find(s => s._isTutorial)) {
           window.shortcutMod.items = window.shortcutMod.items.filter(s => !s._isTutorial);
           window.shortcuts = window.shortcutMod.items;
           if (window.renderShortcuts) window.renderShortcuts();
        }
      }

      // 메모 임시 데이터 상태 관리
      if (state === 'memo') {
        if (window.memo && window.memo.items && !window.memo.items.find(m => m.id === dummyMemoId)) {
          window.memo.items.push({ id: dummyMemoId, title: window.i18n ? window.i18n.get("tutMemoTitle") : "튜토리얼 메모", content: window.i18n ? window.i18n.get("tutMemoContent") : "이것은 튜토리얼을 위한 임시 메모입니다." });
          window.memos = window.memo.items;
          if (window.renderMemos) window.renderMemos();
        }
      } else if (state === 'none' || state === 'clear_all' || state === 'shortcut' || state === 'noti') {
        if (window.memo && window.memo.items && window.memo.items.find(m => m.id === dummyMemoId)) {
           window.memo.items = window.memo.items.filter(m => m.id !== dummyMemoId);
           window.memos = window.memo.items;
           if (window.renderMemos) window.renderMemos();
        }
      }

      // 알람 임시 데이터 상태 관리
      if (state === 'noti') {
        if (window.noti && window.noti.items && !window.noti.items.find(n => n.id === dummyNotiId)) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          window.noti.items.push({ id: dummyNotiId, title: window.i18n ? window.i18n.get("tutNotiTitle") : "튜토리얼 알람", type: "time", date: tomorrow.toISOString().split("T")[0], time: "09:00" });
          window.notifications = window.noti.items;
          if (window.renderNotifications) window.renderNotifications();
        }
      } else if (state === 'none' || state === 'clear_all' || state === 'shortcut' || state === 'memo') {
        if (window.noti && window.noti.items && window.noti.items.find(n => n.id === dummyNotiId)) {
           window.noti.items = window.noti.items.filter(n => n.id !== dummyNotiId);
           window.notifications = window.noti.items;
           if (window.renderNotifications) window.renderNotifications();
        }
      }
    };

    const d = driverLib({
      showProgress: true,
      nextBtnText: window.i18n ? window.i18n.get("tutNextBtn") : "다음 →",
      prevBtnText: window.i18n ? window.i18n.get("tutPrevBtn") : "← 이전",
      doneBtnText: window.i18n ? window.i18n.get("tutDoneBtn") : "완료",
      showButtons: ["next", "previous"],
      allowClose: true,
      animate: true,
      smoothScroll: true,
      overlayColor: "rgba(0, 0, 0, 0.85)", // 강한 후레시 효과를 위해 주변을 더 어둡게
      stagePadding: 15, // 좀 더 넓은 후레시 반경
      stageRadius: 100, // 높은 값을 주어 둥근 효과 유도
      onDestroyStarted: () => {
        if (!d.getState().isDestroying) {
            d.getState().isDestroying = true;
            document.body.classList.add("tutorial-closing");

            setTimeout(() => {
                d.destroy();
                document.body.classList.remove("tutorial-closing");
            }, 400); // 0.3s transition + 0.1s 여유
        }
      },
      steps: [
        {
          element: "#top-left-widgets .fab-main",
          popover: {
            title: window.i18n ? window.i18n.get("tutFileManageTitle") : "📂 파일 관리",
            description: window.i18n ? window.i18n.get("tutFileManageDesc") : "가장 먼저 데이터 관리입니다. 현재까지 설정한 위젯, 테마, 데이터 등을 백업하고 복원할 수 있습니다.",
            side: "right",
            align: "start",
          },
          onHighlightStarted: () => syncDummyData('none')
        },
        {
          element: "#top-right-widgets",
          popover: {
            title: window.i18n ? window.i18n.get("tutWeatherTitle") : "🌤️ 실시간 날씨",
            description: window.i18n ? window.i18n.get("tutWeatherDesc") : "현재 위치의 날씨와 예보를 보여줍니다.<br>정확한 정보를 위해 브라우저의 <b>위치 권한 허용</b>이 필요합니다.",
            side: "left",
            align: "start",
          },
          onHighlightStarted: () => syncDummyData('none')
        },
        {
          element: ".search-engine-icon",
          popover: {
            title: window.i18n ? window.i18n.get("tutSearchTitle") : "🔍 스마트 검색",
            description: window.i18n ? window.i18n.get("tutSearchDesc") : "다양한 검색 엔진을 즉시 변경하며 검색할 수 있습니다. 나만의 엔진을 추가하는 것도 가능해요.",
            side: "bottom",
            align: "center",
          },
          onHighlightStarted: () => syncDummyData('none')
        },
        {
          element: ".ai-icon-wrapper",
          popover: {
            title: window.i18n ? window.i18n.get("tutAITitle") : "🤖 AI 어시스턴트",
            description: window.i18n ? window.i18n.get("tutAIDesc") : "OpenAI, Gemini는 물론 로컬 AI를 연결하여 대화해 보세요. 궁금한 점을 즉시 해결할 수 있습니다.",
            side: "bottom",
            align: "center",
          },
          onHighlightStarted: () => syncDummyData('none')
        },
        {
          element: ".sidebar-trigger",
          popover: {
            title: window.i18n ? window.i18n.get("tutPanelTitle") : "🖱️ 위젯 패널",
            description: window.i18n ? window.i18n.get("tutPanelDesc") : "화면 우측 끝 화살표에 마우스를 올리면 패널이 나타납니다. 여기서 필요한 위젯만 켜고 끌 수 있습니다.",
            side: "left",
            align: "center",
          },
          onHighlightStarted: () => syncDummyData('none')
        },
        {
          element: "#calendar-container",
          popover: {
            title: window.i18n ? window.i18n.get("tutCalTitle") : "📅 캘린더",
            description: window.i18n ? window.i18n.get("tutCalDesc") : "일정을 확인하고 월별로 쉽게 이동할 수 있습니다.<br>원하는 날짜를 클릭해 <b>반복 설정</b>이 가능한 알람을 바로 추가해 보세요.",
            side: "left",
            align: "end",
          },
          onHighlightStarted: () => syncDummyData('none')
        },
        {
          element: "#clock-container",
          popover: {
            title: window.i18n ? window.i18n.get("tutClockTitle") : "⏰ 시계 위젯",
            description: window.i18n ? window.i18n.get("tutClockDesc") : "현재 시간과 날짜를 한눈에 확인하고, 클릭하여 12/24시간 포맷을 변경할 수 있습니다.",
            side: "top",
            align: "center",
          },
          onHighlightStarted: () => syncDummyData('none')
        },
        {
          element: ".bottom-widgets .left-area .fab-main",
          popover: {
            title: window.i18n ? window.i18n.get("tutMenuTitle") : "⚙️ 메뉴 열기",
            description: window.i18n ? window.i18n.get("tutMenuDesc") : "설정 위젯을 클릭하면 다양한 추가 메뉴가 나타납니다. 오른쪽 바로가기 추가부터 하나씩 살펴볼까요?",
            side: "top",
            align: "start",
          },
          onHighlightStarted: () => {
            syncDummyData('none');
            const blFab = document.getElementById('bl-fab');
            if (blFab) blFab.classList.add('active');
          }
        },
        {
          element: '#bl-fab .widget-btn[data-i18n-title="tipLink"]',
          popover: {
            title: window.i18n ? window.i18n.get("tutAddShortcutTitle") : "🔗 바로가기 추가",
            description: window.i18n ? window.i18n.get("tutAddShortcutDesc") : "자주 방문하는 웹사이트를 바로가기로 등록할 수 있습니다.",
            side: "top",
            align: "center",
          },
          onHighlightStarted: () => {
            syncDummyData('none'); // Clear others
            const blFab = document.getElementById('bl-fab');
            if (blFab) blFab.classList.add('active');
          }
        },
        {
          element: "#shortcut-container",
          popover: {
            title: window.i18n ? window.i18n.get("tutShortcutAreaTitle") : "🔗 빠른 바로가기 영역",
            description: window.i18n ? window.i18n.get("tutShortcutAreaDesc") : "추가된 바로가기들은 화면 중앙에 나타나며, 드래그 앤 드롭으로 순서를 바꿀 수 있습니다.",
            side: "top",
            align: "center",
          },
          onHighlightStarted: (element) => {
            syncDummyData('shortcut');
            const blFab = document.getElementById('bl-fab');
            if (blFab) blFab.classList.remove('active'); // Close menu to see center
            if (element) {
              element.style.transition = "none";
              const clockContainer = document.getElementById("clock-container");
              if (clockContainer) {
                const clockBottom = clockContainer.getBoundingClientRect().bottom;
                const containerTop = element.getBoundingClientRect().top;
                const height = Math.max(250, clockBottom - containerTop);
                element.style.minHeight = height + "px";
              } else {
                element.style.minHeight = "250px";
              }
            }
          },
          onDeselected: (element) => {
            if (element) {
              element.style.transition = "";
              element.style.minHeight = "";
            }
          }
        },
        {
          element: '#bl-fab .widget-btn[data-i18n-title="tipMemo"]',
          popover: {
            title: window.i18n ? window.i18n.get("tutAddMemoTitle") : "📝 메모 추가",
            description: window.i18n ? window.i18n.get("tutAddMemoDesc") : "빠르게 기록해야 할 내용이 있다면 메모 아이콘을 누르세요.",
            side: "top",
            align: "center",
          },
          onHighlightStarted: () => {
            syncDummyData('none'); // Clear others
            const blFab = document.getElementById('bl-fab');
            if (blFab) blFab.classList.add('active');
          }
        },
        {
          element: "#memo-folder",
          popover: {
            title: window.i18n ? window.i18n.get("tutDesktopMemoTitle") : "📝 바탕화면 메모",
            description: window.i18n ? window.i18n.get("tutDesktopMemoDesc") : "작성한 메모는 왼쪽 바탕화면에 보관됩니다. 이 튜토리얼 메모처럼 언제든 확인할 수 있습니다.",
            side: "right",
            align: "start",
          },
          onHighlightStarted: () => {
            syncDummyData('memo');
            const blFab = document.getElementById('bl-fab');
            if (blFab) blFab.classList.remove('active'); // Close menu
            const folder = document.getElementById('memo-folder');
            if (folder) folder.classList.add('open');
          },
          onDeselected: () => {
            const folder = document.getElementById('memo-folder');
            if (folder) folder.classList.remove('open');
          }
        },
        {
          element: '#bl-fab .widget-btn[data-i18n-title="tipNoti"]',
          popover: {
            title: window.i18n ? window.i18n.get("tutAddAlertTitle") : "🔔 알람 추가",
            description: window.i18n ? window.i18n.get("tutAddAlertDesc") : "원하는 시간에 알람이나 타이머를 추가할 수 있습니다.",
            side: "top",
            align: "center",
          },
          onHighlightStarted: () => {
            syncDummyData('none'); // Clear others
            const blFab = document.getElementById('bl-fab');
            if (blFab) blFab.classList.add('active');
          }
        },
        {
          element: "#noti-folder",
          popover: {
            title: window.i18n ? window.i18n.get("tutAlertAreaTitle") : "🔔 설정된 알람",
            description: window.i18n ? window.i18n.get("tutAlertAreaDesc") : "설정한 알람도 바탕화면에서 한눈에 관리할 수 있습니다.",
            side: "left",
            align: "end",
          },
          onHighlightStarted: () => {
            syncDummyData('noti');
            const blFab = document.getElementById('bl-fab');
            if (blFab) blFab.classList.remove('active'); // Close menu
            const folder = document.getElementById('noti-folder');
            if (folder) folder.classList.add('open');
          },
          onDeselected: () => {
            const folder = document.getElementById('noti-folder');
            if (folder) folder.classList.remove('open');
          }
        },
        {
          element: '#bl-fab .widget-btn[data-i18n-title="tipSetting"]',
          popover: {
            title: window.i18n ? window.i18n.get("tutSettingIconTitle") : "⚙️ 환경 설정 아이콘",
            description: window.i18n ? window.i18n.get("tutSettingIconDesc") : "마지막으로, 상세 설정 창을 여는 아이콘입니다.",
            side: "top",
            align: "center",
          },
          onHighlightStarted: () => {
            syncDummyData('none');
            const blFab = document.getElementById('bl-fab');
            if (blFab) blFab.classList.add('active');
          }
        },
        {
          element: "#settingModal .modal-content",
          popover: {
            title: window.i18n ? window.i18n.get("tutConfigTitle") : "🎨 입맛에 맞게 환경을 설정해보세요!",
            description: window.i18n ? window.i18n.get("tutConfigDesc") : "테마 색상부터 위젯 크기, 배경화면까지! 자유롭게 나만의 대시보드를 만들어 보세요.",
            side: "left",
            align: "center",
          },
          onHighlightStarted: () => {
            syncDummyData('none');
            const blFab = document.getElementById('bl-fab');
            if (blFab) blFab.classList.remove('active');
            
            // 모달을 강제로 열어서 driver.js가 하이라이트 할 수 있게 함
            const modal = document.getElementById('settingModal');
            if (modal) {
              modal.style.display = ""; // 이전 코드에서 남아있을 수 있는 속성 제거
              modal.classList.add("show");
            }

            // 축하 폭죽 효과 (Confetti)
            if (typeof window.confetti === 'function') {
              setTimeout(() => {
                window.confetti({
                  particleCount: 150,
                  spread: 80,
                  origin: { y: 0.5 },
                  zIndex: 10005
                });
              }, 400); // 팝업이 뜨고 나서 살짝 뒤에 펑!
            }
          }
        }
      ],
      onDestroyed: () => {
          document.body.classList.remove("tutorial-open");
          localStorage.setItem("dj_tutorial_done", "true");
          
          syncDummyData('clear_all');
          
          // 열려있던 요소 초기화
          if (window.utils) window.utils.closeModal('settingModal');
          const modal = document.getElementById('settingModal');
          if (modal) {
             modal.style.transition = "none";
             modal.classList.remove("show");
             modal.style.display = ""; // 이전 코드 잔재 청소
             void modal.offsetHeight;
             modal.style.transition = "";
          }
          
          const blFab = document.getElementById('bl-fab');
          if (blFab) blFab.classList.remove('active');
          const memoFolder = document.getElementById('memo-folder');
          if (memoFolder) memoFolder.classList.remove('open');
          const notiFolder = document.getElementById('noti-folder');
          if (notiFolder) notiFolder.classList.remove('open');
      }
    });

    // 실행 시작
    document.body.classList.add("tutorial-open");
    d.drive();
  },
};

window.tutorial = tutorial;
window.showTutorial = tutorial.show.bind(tutorial);
window.showIntro = tutorial.showIntro.bind(tutorial);
