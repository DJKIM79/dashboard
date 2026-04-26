const tutorial = {
  show() {
    const driver = window.driver.js.driver,
      T = i18n.langData;
    if (!T) return;

    const d = driver({
      showProgress: true,
      nextBtnText: "→",
      prevBtnText: "←",
      doneBtnText: "✕",
      allowClose: false,
      animate: true,
      onPopoverRender: (popover, { config, state }) => {
        const prevBtn = popover.getPreviousButton();
        const nextBtn = popover.getNextButton();

        // 1. 초기화: 모든 특수 클래스 일단 제거
        if (prevBtn) {
          prevBtn.classList.remove("tut-close-btn");
          prevBtn.style.display = "flex";
        }
        if (nextBtn) {
          nextBtn.classList.remove("tut-close-btn");
        }

        // 2. 1단계 (환영 메시지) 처리
        if (state.activeIndex === 0) {
          if (prevBtn) {
            prevBtn.innerText = "✕";
            prevBtn.classList.add("tut-close-btn");
            prevBtn.onclick = (e) => {
              e.preventDefault();
              d.destroy();
            };
          }
        } else {
          // 2단계 이후부터는 정상적인 화살표 표시
          if (prevBtn) {
            prevBtn.innerText = "←";
            // 기본 동작(이전 단계)으로 돌아가도록 onclick 리셋은 하지 않음 (라이브러리가 제어하도록 둠)
          }
        }

        // 3. 마지막 단계 처리
        if (state.activeIndex === config.steps.length - 1) {
          if (nextBtn) {
            nextBtn.innerText = "✕";
            nextBtn.classList.add("tut-close-btn");
          }
        } else {
          if (nextBtn) {
            nextBtn.innerText = "→";
          }
        }
      },
      steps: [
        {
          popover: {
            title: "👋 반가워요!",
            description:
              "OnTo 대시보드의 주요 기능을 빠르게 살펴볼까요?<br><br>시작하려면 다음을 눌러주세요.",
            side: "center",
            align: "center",
          },
        },
        {
          element: "#top-left-widgets .fab-main",
          popover: {
            title: T.tutFileTitle || "💾 파일 및 데이터",
            description: "파일 관리, 데이터 백업 및 복원 기능을 제공합니다.",
            side: "right",
            align: "start",
          },
          padding: 5,
        },
        {
          element: "#top-right-widgets",
          popover: {
            title: T.tutWeatherTitle,
            description: "실시간 날씨와 상세 예보를 확인하세요.",
            side: "left",
            align: "start",
          },
          padding: 10,
        },
        {
          element: "#quote-section",
          popover: {
            title: "📜 명언 표시",
            description:
              "매번 새로운 영감을 주는 명언이 표시됩니다. 클릭하면 다른 명언으로 바뀝니다.",
            side: "bottom",
            align: "center",
          },
          padding: 10,
        },
        {
          element: ".search-box",
          popover: {
            title: T.tutSearchTitle || "🔍 검색 및 엔진",
            description: "원하는 정보를 검색하고 엔진을 변경할 수 있습니다.",
            side: "top",
            align: "center",
          },
          padding: 10,
        },
        {
          element: ".ai-icon-wrapper",
          popover: {
            title: T.tutAiTitle || "🤖 AI 챗봇",
            description: "로봇 아이콘을 클릭하여 AI와 대화를 시작해 보세요.",
            side: "top",
            align: "center",
          },
          padding: 10,
        },
        {
          element: ".sidebar-trigger",
          popover: {
            title: T.tutSidebarTitle || "🖱️ 위젯 패널 관리",
            description:
              "화면 끝의 화살표에 마우스를 가져가면 패널이 열립니다. 각 아이콘을 클릭하여 날씨, 시계, 메모 등 원하는 위젯을 자유롭게 켜고 끌 수 있습니다.",
            side: "left",
            align: "center",
          },
          padding: 5,
        },
        {
          element: ".bottom-widgets .right-area",
          popover: {
            title: T.tutBottomWidgetsTitle,
            description: "일정과 시간을 한눈에 확인하는 공간입니다.",
            side: "top",
            align: "end",
          },
          padding: 10,
        },
        {
          element: ".bottom-widgets .left-area .fab-main",
          popover: {
            title: T.tutSettingTitle || "⚙️ 환경 설정",
            description: "테마, 배경화면, 초기화 등 모든 설정을 관리합니다.",
            side: "top",
            align: "start",
          },
          padding: 5,
        },
      ],
    });
    d.drive();
  },
};

window.tutorial = tutorial;
window.showTutorial = tutorial.show.bind(tutorial);
