const tutorial = {
  show() {
    const driver = window.driver.js.driver,
      T = i18n.langData;
    if (!T) return;
    
    driver({
      showProgress: true,
      nextBtnText: T.tutNext,
      prevBtnText: T.tutPrev,
      doneBtnText: T.tutDone,
      allowClose: false,
      steps: [
        {
          element: ".sidebar-trigger",
          popover: {
            title: T.tutSidebarTitle,
            description: T.tutSidebarDesc,
            side: "left",
            align: "center",
          },
        },
        {
          element: "#top-right-widgets",
          popover: {
            title: T.tutWeatherTitle,
            description: T.tutWeatherDesc,
            side: "left",
            align: "start",
          },
        },
        {
          element: "#search-section",
          popover: {
            title: T.tutMainTitle,
            description: T.tutMainDesc,
            side: "bottom",
            align: "center",
          },
        },
        {
          element: ".right-area",
          popover: {
            title: T.tutBottomWidgetsTitle,
            description: T.tutBottomWidgetsDesc,
            side: "top",
            align: "end",
          },
        },
        {
          element: ".bottom-widgets .left-area .fab-container",
          popover: {
            title: T.tutSettingTitle,
            description: T.tutSettingDesc,
            side: "top",
            align: "start",
          },
        },
        {
          element: "#top-left-widgets .fab-container",
          popover: {
            title: T.tutFileTitle,
            description: T.tutFileDesc,
            side: "right",
            align: "start",
          },
        },
      ],
    }).drive();
  }
};

window.tutorial = tutorial;
window.showTutorial = () => tutorial.show();
