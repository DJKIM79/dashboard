const shortcutMod = {
  items: JSON.parse(localStorage.getItem("dj_shortcuts")) || [],
  isDragging: false,
  resizeListenerAdded: false,
  popularIcons: [
    // --- UI & Essentials ---
    "fa-house", "fa-user", "fa-check", "fa-xmark", "fa-magnifying-glass", "fa-gear", "fa-trash", "fa-plus",
    "fa-minus", "fa-star", "fa-heart", "fa-bell", "fa-envelope", "fa-lock", "fa-unlock", "fa-key",
    "fa-flag", "fa-bookmark", "fa-share", "fa-download", "fa-upload", "fa-eye", "fa-eye-slash", "fa-info",
    "fa-question", "fa-exclamation", "fa-circle-info", "fa-circle-question", "fa-circle-exclamation", "fa-circle-check", "fa-circle-xmark", "fa-ban",
    "fa-arrow-up", "fa-arrow-down", "fa-arrow-left", "fa-arrow-right", "fa-chevron-up", "fa-chevron-down", "fa-chevron-left", "fa-chevron-right",
    "fa-caret-up", "fa-caret-down", "fa-caret-left", "fa-caret-right", "fa-angles-up", "fa-angles-down", "fa-angles-left", "fa-angles-right",
    "fa-rotate", "fa-rotate-left", "fa-rotate-right", "fa-arrows-rotate", "fa-sync", "fa-power-off", "fa-sign-in", "fa-sign-out",
    "fa-bars", "fa-ellipsis", "fa-ellipsis-vertical", "fa-grip", "fa-grip-vertical", "fa-list", "fa-table-list", "fa-grid",
    "fa-folder", "fa-folder-open", "fa-folder-plus", "fa-folder-minus", "fa-file", "fa-file-lines", "fa-file-pdf", "fa-file-csv",
    "fa-file-excel", "fa-file-word", "fa-file-powerpoint", "fa-file-image", "fa-file-video", "fa-file-audio", "fa-file-code", "fa-file-zipper",
    "fa-copy", "fa-paste", "fa-scissors", "fa-clippy", "fa-pen", "fa-pen-to-square", "fa-eraser", "fa-floppy-disk",
    "fa-share-nodes", "fa-link", "fa-unlink", "fa-paperclip", "fa-magnifying-glass-plus", "fa-magnifying-glass-minus", "fa-expand", "fa-compress",

    // --- Communication & Brands ---
    "fab fa-google", "fab fa-facebook", "fab fa-twitter", "fab fa-instagram", "fab fa-youtube", "fab fa-github", "fab fa-discord", "fab fa-slack",
    "fab fa-linkedin", "fab fa-twitch", "fab fa-reddit", "fab fa-tiktok", "fab fa-whatsapp", "fab fa-telegram", "fab fa-medium", "fab fa-pinterest",
    "fab fa-apple", "fab fa-windows", "fab fa-android", "fab fa-linux", "fab fa-chrome", "fab fa-firefox", "fab fa-edge", "fab fa-safari",
    "fab fa-spotify", "fab fa-soundcloud", "fab fa-vimeo", "fab fa-dailymotion", "fab fa-amazon", "fab fa-ebay", "fab fa-paypal", "fab fa-stripe",
    "fab fa-bitcoin", "fab fa-ethereum", "fab fa-stack-overflow", "fab fa-stack-exchange", "fab fa-npm", "fab fa-node-js", "fab fa-react", "fab fa-vuejs",
    "fab fa-angular", "fab fa-js", "fab fa-python", "fab fa-php", "fab fa-java", "fab fa-swift", "fab fa-rust", "fab fa-docker",
    "fab fa-aws", "fab fa-digital-ocean", "fab fa-cloudflare", "fab fa-dropbox", "fab fa-google-drive", "fab fa-trello", "fab fa-figma", "fab fa-sketch",
    "fab fa-adobe", "fab fa-microsoft", "fab fa-wordpress", "fab fa-joomla", "fab fa-drupal", "fab fa-shopify", "fab fa-magento", "fab fa-etsy",
    "fa-comment", "fa-comments", "fa-message", "fa-at", "fa-hashtag", "fa-paper-plane", "fa-inbox", "fa-outbox",
    "fa-rss", "fa-broadcast-tower", "fa-walkie-talkie", "fa-phone", "fa-phone-volume", "fa-video", "fa-video-slash", "fa-microphone",

    // --- Business & Finance ---
    "fa-briefcase", "fa-building", "fa-landmark", "fa-bank", "fa-credit-card", "fa-wallet", "fa-money-bill", "fa-money-bills",
    "fa-money-bill-transfer", "fa-money-bill-trend-up", "fa-money-check", "fa-money-check-dollar", "fa-coins", "fa-sack-dollar", "fa-hand-holding-dollar", "fa-receipt",
    "fa-file-invoice", "fa-file-invoice-dollar", "fa-cart-shopping", "fa-cart-plus", "fa-bag-shopping", "fa-basket-shopping", "fa-shop", "fa-store",
    "fa-tag", "fa-tags", "fa-barcode", "fa-qrcode", "fa-chart-line", "fa-chart-column", "fa-chart-bar", "fa-chart-pie",
    "fa-chart-area", "fa-chart-gantt", "fa-diagram-project", "fa-diagram-successor", "fa-bullseye", "fa-bullhorn", "fa-magnifying-glass-dollar", "fa-magnifying-glass-chart",
    "fa-calculator", "fa-abacus", "fa-percentage", "fa-percent", "fa-arrow-trend-up", "fa-arrow-trend-down", "fa-vault", "fa-piggy-bank",
    "fa-handshake", "fa-user-tie", "fa-users-gear", "fa-address-book", "fa-address-card", "fa-id-card", "fa-id-badge", "fa-business-time",
    "fa-calendar-days", "fa-calendar-check", "fa-calendar-plus", "fa-calendar-minus", "fa-calendar-xmark", "fa-clock", "fa-hourglass", "fa-stopwatch",

    // --- Media & Entertainment ---
    "fa-play", "fa-pause", "fa-stop", "fa-forward", "fa-backward", "fa-forward-step", "fa-backward-step", "fa-eject",
    "fa-volume-high", "fa-volume-low", "fa-volume-off", "fa-volume-xmark", "fa-headphones", "fa-music", "fa-guitar", "fa-drum",
    "fa-microphone-lines", "fa-radio", "fa-podcast", "fa-compact-disc", "fa-record-vinyl", "fa-tv", "fa-film", "fa-clapperboard",
    "fa-video-camera", "fa-camera-retro", "fa-image", "fa-images", "fa-photo-film", "fa-paintbrush", "fa-palette", "fa-eye-dropper",
    "fa-brush", "fa-fill-drip", "fa-gamepad", "fa-joystick", "fa-puzzle-piece", "fa-dice", "fa-dice-five", "fa-chess",
    "fa-chess-knight", "fa-chess-queen", "fa-trophy", "fa-medal", "fa-award", "fa-ticket", "fa-ticket-simple", "fa-masks-theater",
    "fa-wand-magic", "fa-wand-magic-sparkles", "fa-hat-wizard", "fa-ghost", "fa-dragon", "fa-robot", "fa-vr-cardboard", "fa-diamond",
    "fa-gem", "fa-clover", "fa-cannabis", "fa-spa", "fa-om", "fa-dharmachakra", "fa-yin-yang", "fa-peace",

    // --- Food & Beverage ---
    "fa-utensils", "fa-bowl-food", "fa-plate-wheat", "fa-wheat-awn", "fa-mug-hot", "fa-coffee", "fa-tea", "fa-glass-water",
    "fa-wine-glass", "fa-wine-bottle", "fa-beer-mug-empty", "fa-cocktail", "fa-martini-glass", "fa-whiskey-glass", "fa-bottle-water", "fa-bottle-droplet",
    "fa-burger", "fa-pizza-slice", "fa-hotdog", "fa-sandwich", "fa-taco", "fa-burrito", "fa-bowl-rice", "fa-noodles",
    "fa-ice-cream", "fa-cake-candles", "fa-cookie", "fa-cookie-bite", "fa-donut", "fa-candy-cane", "fa-apple-whole", "fa-carrot",
    "fa-egg", "fa-cheese", "fa-bacon", "fa-drumstick-bite", "fa-fish", "fa-shrimp", "fa-lemon", "fa-pepper-hot",
    "fa-bread-slice", "fa-croissant", "fa-bagel", "fa-blender", "fa-kitchen-set", "fa-fire-burner", "fa-refrigerator", "fa-sink",

    // --- Travel & Places ---
    "fa-plane", "fa-plane-departure", "fa-plane-arrival", "fa-helicopter", "fa-rocket", "fa-shuttle-space", "fa-train", "fa-train-subway",
    "fa-bus", "fa-bus-simple", "fa-car", "fa-car-side", "fa-truck", "fa-truck-moving", "fa-motorcycle", "fa-bicycle",
    "fa-ship", "fa-boat", "fa-anchor", "fa-suitcase", "fa-suitcase-rolling", "fa-passport", "fa-globe", "fa-earth-americas",
    "fa-map", "fa-map-location", "fa-map-pin", "fa-location-dot", "fa-location-arrow", "fa-compass", "fa-signs-post", "fa-route",
    "fa-hotel", "fa-bed", "fa-tent", "fa-campground", "fa-mountain", "fa-mountain-sun", "fa-umbrella-beach", "fa-sun",
    "fa-tree", "fa-city", "fa-building-columns", "fa-hospital", "fa-school", "fa-university", "fa-landmark", "fa-church",
    "fa-mosque", "fa-synagogue", "fa-vihara", "fa-torii-gate", "fa-house-chimney", "fa-house-user", "fa-warehouse", "fa-gas-pump",

    // --- Science & Technology ---
    "fa-microchip", "fa-memory", "fa-processor", "fa-server", "fa-database", "fa-network-wired", "fa-ethernet", "fa-wifi",
    "fa-signal", "fa-satellite", "fa-satellite-dish", "fa-tower-broadcast", "fa-laptop", "fa-laptop-code", "fa-desktop", "fa-computer",
    "fa-tablet", "fa-mobile", "fa-mobile-screen", "fa-print", "fa-keyboard", "fa-mouse", "fa-hard-drive", "fa-sd-card",
    "fa-sim-card", "fa-usb", "fa-battery-full", "fa-battery-three-quarters", "fa-battery-half", "fa-battery-quarter", "fa-battery-empty", "fa-plug",
    "fa-bolt", "fa-bolt-lightning", "fa-lightbulb", "fa-flashlight", "fa-microscope", "fa-flask", "fa-flask-vial", "fa-vials",
    "fa-dna", "fa-atom", "fa-molecule", "fa-radiation", "fa-biohazard", "fa-magnet", "fa-telescope", "fa-gauge",
    "fa-code", "fa-code-branch", "fa-code-commit", "fa-code-compare", "fa-code-fork", "fa-code-pull-request", "fa-terminal", "fa-bug",

    // --- Medical & Health ---
    "fa-heart-pulse", "fa-stethoscope", "fa-user-doctor", "fa-user-nurse", "fa-hospital-user", "fa-kit-medical", "fa-first-aid", "fa-pills",
    "fa-capsules", "fa-syringe", "fa-bandage", "fa-thermometer", "fa-weight-scale", "fa-lungs", "fa-brain", "fa-tooth",
    "fa-eye", "fa-droplet", "fa-virus", "fa-bacteria", "fa-microbes", "fa-mask-face", "fa-hand-dots", "fa-wheelchair",
    "fa-crutch", "fa-bed-pulse", "fa-prescription", "fa-prescription-bottle", "fa-notes-medical", "fa-clipboard-list", "fa-hand-holding-medical", "fa-heart-crack",
    "fa-dumbbell", "fa-person-running", "fa-person-walking", "fa-person-swimming", "fa-person-hiking", "fa-person-biking", "fa-skating", "fa-snowboarding",
    "fa-table-tennis-paddle-ball", "fa-baseball-bat-ball", "fa-basketball", "fa-football", "fa-volleyball", "fa-golf-ball-tee", "fa-bowling-ball", "fa-mitten",

    // --- Nature & Animals ---
    "fa-leaf", "fa-seedling", "fa-clover", "fa-tree", "fa-flower", "fa-mountain", "fa-mountain-city", "fa-hill-rocky-canany",
    "fa-water", "fa-wave-square", "fa-wind", "fa-fire", "fa-fire-flame-curved", "fa-snowflake", "fa-cloud", "fa-cloud-sun",
    "fa-cloud-moon", "fa-cloud-rain", "fa-cloud-showers-heavy", "fa-cloud-bolt", "fa-rainbow", "fa-meteor", "fa-moon", "fa-sun",
    "fa-paw", "fa-dog", "fa-cat", "fa-horse", "fa-cow", "fa-pig", "fa-sheep", "fa-bird",
    "fa-dove", "fa-crow", "fa-kiwi-bird", "fa-otter", "fa-hippo", "fa-elephant", "fa-spider", "fa-bug",
    "fa-fish", "fa-shrimp", "fa-dragon", "fa-frog", "fa-snake", "fa-mosquito", "fa-locust", "fa-worm",

    // --- Tools & Objects ---
    "fa-hammer", "fa-wrench", "fa-screwdriver", "fa-screwdriver-wrench", "fa-toolbox", "fa-gear", "fa-gears", "fa-pen-ruler",
    "fa-ruler", "fa-ruler-combined", "fa-compass-drafting", "fa-stapler", "fa-paperclip", "fa-thumbtack", "fa-magnifying-glass", "fa-scissors",
    "fa-umbrella", "fa-broom", "fa-trash-can", "fa-bucket", "fa-soap", "fa-shower", "fa-bath", "fa-toilet",
    "fa-bed", "fa-chair", "fa-couch", "fa-lamp", "fa-door-open", "fa-door-closed", "fa-window-maximize", "fa-key",
    "fa-shield", "fa-shield-halved", "fa-shield-heart", "fa-lock", "fa-unlock", "fa-handcuffs", "fa-gavel", "fa-hammer",
    "fa-book", "fa-book-open", "fa-book-bookmark", "fa-newspaper", "fa-scroll", "fa-certificate", "fa-graduation-cap", "fa-school",
    "fa-gift", "fa-box", "fa-boxes-stacked", "fa-truck-ramp-box", "fa-dolly", "fa-crown", "fa-gem", "fa-ring",

    // --- Symbols & Arrows ---
    "fa-plus", "fa-minus", "fa-multiply", "fa-divide", "fa-equals", "fa-not-equal", "fa-greater-than", "fa-less-than",
    "fa-infinity", "fa-omega", "fa-pi", "fa-sigma", "fa-square-root-variable", "fa-function", "fa-arrow-up", "fa-arrow-down",
    "fa-arrow-left", "fa-arrow-right", "fa-arrow-up-right", "fa-arrow-up-left", "fa-arrow-down-right", "fa-arrow-down-left", "fa-arrows-up-down", "fa-arrows-left-right",
    "fa-arrows-to-dot", "fa-arrows-spin", "fa-arrows-split-up-and-left", "fa-arrows-turn-right", "fa-arrow-rotate-left", "fa-arrow-rotate-right", "fa-undo", "fa-redo",
    "fa-circle", "fa-square", "fa-triangle", "fa-diamond", "fa-star", "fa-heart", "fa-shapes", "fa-cube",

    // --- Clothing & Fashion ---
    "fa-shirt", "fa-socks", "fa-mitten", "fa-hat-cowboy", "fa-hat-wizard", "fa-glasses", "fa-gem", "fa-crown",
    "fa-bag-shopping", "fa-briefcase", "fa-boot", "fa-shoe-prints", "fa-tie", "fa-user-ninja", "fa-user-astronaut", "fa-user-secret",

    // --- Added for Variety (Completing ~1000) ---
    "fa-anchor", "fa-atom", "fa-baby", "fa-baby-carriage", "fa-bacon", "fa-bahai", "fa-band-aid", "fa-baseball",
    "fa-basketball", "fa-bath", "fa-battery-empty", "fa-battery-full", "fa-battery-half", "fa-battery-quarter", "fa-battery-three-quarters", "fa-bed",
    "fa-beer", "fa-bell", "fa-bell-slash", "fa-bezier-curve", "fa-bible", "fa-bicycle", "fa-binoculars", "fa-birthday-cake",
    "fa-blender", "fa-blind", "fa-blog", "fa-bold", "fa-bolt", "fa-bomb", "fa-bone", "fa-bong",
    "fa-book", "fa-book-dead", "fa-book-medical", "fa-book-open", "fa-book-reader", "fa-bookmark", "fa-bowling-ball", "fa-box",
    "fa-box-open", "fa-boxes", "fa-braille", "fa-brain", "fa-bread-slice", "fa-briefcase", "fa-briefcase-medical", "fa-broadcast-tower",
    "fa-broom", "fa-brush", "fa-bug", "fa-building", "fa-bullhorn", "fa-bullseye", "fa-burn", "fa-bus",
    "fa-bus-alt", "fa-business-time", "fa-calculator", "fa-calendar", "fa-calendar-alt", "fa-calendar-check", "fa-calendar-day", "fa-calendar-minus",
    "fa-calendar-plus", "fa-calendar-times", "fa-calendar-week", "fa-camera", "fa-camera-retro", "fa-campground", "fa-candy-cane", "fa-cannabis",
    "fa-capsules", "fa-car", "fa-car-alt", "fa-car-battery", "fa-car-crash", "fa-car-side", "fa-caret-down", "fa-caret-left",
    "fa-caret-right", "fa-caret-square-down", "fa-caret-square-left", "fa-caret-square-right", "fa-caret-square-up", "fa-caret-up", "fa-carrot", "fa-cart-arrow-down",
    "fa-cart-plus", "fa-cash-register", "fa-cat", "fa-certificate", "fa-chair", "fa-chalkboard", "fa-chalkboard-teacher", "fa-charging-station",
    "fa-chart-area", "fa-chart-bar", "fa-chart-line", "fa-chart-pie", "fa-check", "fa-check-circle", "fa-check-double", "fa-check-square",
    "fa-cheese", "fa-chess", "fa-chess-bishop", "fa-chess-board", "fa-chess-king", "fa-chess-knight", "fa-chess-pawn", "fa-chess-queen",
    "fa-chess-rook", "fa-chevron-circle-down", "fa-chevron-circle-left", "fa-chevron-circle-right", "fa-chevron-circle-up", "fa-chevron-down", "fa-chevron-left", "fa-chevron-right",
    "fa-chevron-up", "fa-child", "fa-church", "fa-circle", "fa-circle-notch", "fa-city", "fa-clinic-medical", "fa-clipboard",
    "fa-clipboard-check", "fa-clipboard-list", "fa-clock", "fa-clone", "fa-closed-captioning", "fa-cloud", "fa-cloud-download-alt", "fa-cloud-meatball",
    "fa-cloud-moon", "fa-cloud-moon-rain", "fa-cloud-sun", "fa-cloud-sun-rain", "fa-cloud-upload-alt", "fa-cocktail", "fa-code", "fa-code-branch",
    "fa-coffee", "fa-cog", "fa-cogs", "fa-coins", "fa-columns", "fa-comment", "fa-comment-alt", "fa-comment-dollar",
    "fa-comment-dots", "fa-comment-medical", "fa-comment-slash", "fa-comments", "fa-comments-dollar", "fa-compact-disc", "fa-compass", "fa-compress",
    "fa-compress-arrows-alt", "fa-concierge-bell", "fa-cookie", "fa-cookie-bite", "fa-copy", "fa-copyright", "fa-couch", "fa-credit-card",
    "fa-crop", "fa-crop-alt", "fa-cross", "fa-crosshairs", "fa-crow", "fa-crown", "fa-crutch", "fa-cube",
    "fa-cubes", "fa-cut", "fa-database", "fa-deaf", "fa-desktop", "fa-dharmachakra", "fa-diagnoses", "fa-dice",
    "fa-dice-d20", "fa-dice-d6", "fa-dice-five", "fa-dice-four", "fa-dice-one", "fa-dice-six", "fa-dice-three", "fa-dice-two",
    "fa-digital-tachograph", "fa-directions", "fa-divide", "fa-dizzy", "fa-dna", "fa-dog", "fa-dollar-sign", "fa-dolly",
    "fa-dolly-flatbed", "fa-donate", "fa-door-closed", "fa-door-open", "fa-dot-circle", "fa-dove", "fa-download", "fa-drafting-compass",
    "fa-dragon", "fa-draw-polygon", "fa-drum", "fa-drum-steelpan", "fa-drumstick-bite", "fa-dumbbell", "fa-dumpster", "fa-dumpster-fire",
    "fa-dungeon", "fa-edit", "fa-egg", "fa-eject", "fa-ellipsis-h", "fa-ellipsis-v", "fa-envelope", "fa-envelope-open",
    "fa-envelope-open-text", "fa-envelope-square", "fa-equals", "fa-eraser", "fa-ethernet", "fa-euro-sign", "fa-exchange-alt", "fa-exclamation",
    "fa-exclamation-circle", "fa-exclamation-triangle", "fa-expand", "fa-expand-arrows-alt", "fa-external-link-alt", "fa-external-link-square-alt", "fa-eye", "fa-eye-dropper",
    "fa-eye-slash", "fa-fast-backward", "fa-fast-forward", "fa-fax", "fa-feather", "fa-feather-alt", "fa-female", "fa-fighter-jet",
    "fa-file", "fa-file-alt", "fa-file-archive", "fa-file-audio", "fa-file-code", "fa-file-contract", "fa-file-csv", "fa-file-download",
    "fa-file-excel", "fa-file-export", "fa-file-image", "fa-file-import", "fa-file-invoice", "fa-file-invoice-dollar", "fa-file-medical", "fa-file-medical-alt",
    "fa-file-pdf", "fa-file-powerpoint", "fa-file-prescription", "fa-file-signature", "fa-file-upload", "fa-file-video", "fa-file-word", "fa-fill",
    "fa-fill-drip", "fa-film", "fa-filter", "fa-fingerprint", "fa-fire", "fa-fire-alt", "fa-fire-extinguisher", "fa-first-aid",
    "fa-fish", "fa-fist-raised", "fa-flag", "fa-flag-checkered", "fa-flag-usa", "fa-flask", "fa-flushed", "fa-folder",
    "fa-folder-minus", "fa-folder-open", "fa-folder-plus", "fa-font", "fa-football-ball", "fa-forward", "fa-frog", "fa-frown",
    "fa-frown-open", "fa-funnel-dollar", "fa-futbol", "fa-gamepad", "fa-gas-pump", "fa-gavel", "fa-gem", "fa-genderless",
    "fa-ghost", "fa-gift", "fa-gifts", "fa-glass-cheers", "fa-glass-martini", "fa-glass-martini-alt", "fa-glass-whiskey", "fa-glasses",
    "fa-globe", "fa-globe-africa", "fa-globe-americas", "fa-globe-asia", "fa-globe-europe", "fa-golf-ball", "fa-gopuram", "fa-graduation-cap",
    "fa-greater-than", "fa-greater-than-equal", "fa-grimace", "fa-grin", "fa-grin-alt", "fa-grin-beam", "fa-grin-beam-sweat", "fa-grin-hearts",
    "fa-grin-squint", "fa-grin-squint-tears", "fa-grin-stars", "fa-grin-tears", "fa-grin-tongue", "fa-grin-tongue-squint", "fa-grin-tongue-wink", "fa-grin-wink",
    "fa-grip-horizontal", "fa-grip-lines", "fa-grip-lines-vertical", "fa-grip-vertical", "fa-guitar", "fa-h-square", "fa-hamburger", "fa-hammer",
    "fa-hamsa", "fa-hand-holding", "fa-hand-holding-heart", "fa-hand-holding-usd", "fa-hand-lizard", "fa-hand-middle-finger", "fa-hand-paper", "fa-hand-peace",
    "fa-hand-point-down", "fa-hand-point-left", "fa-hand-point-right", "fa-hand-point-up", "fa-hand-pointer", "fa-hand-rock", "fa-hand-scissors", "fa-hand-spock",
    "fa-hands", "fa-hands-helping", "fa-handshake", "fa-hanukiah", "fa-hard-hat", "fa-hashtag", "fa-hat-cowboy", "fa-hat-cowboy-side",
    "fa-hat-wizard", "fa-haykal", "fa-hdd", "fa-heading", "fa-headphones", "fa-headphones-alt", "fa-headset", "fa-heart",
    "fa-heart-broken", "fa-heartbeat", "fa-helicopter", "fa-highlighter", "fa-hiking", "fa-hippo", "fa-history", "fa-hockey-puck",
    "fa-holly-berry", "fa-home", "fa-horse", "fa-horse-head", "fa-hospital", "fa-hospital-alt", "fa-hospital-symbol", "fa-hot-tub",
    "fa-hotdog", "fa-hotel", "fa-hourglass", "fa-hourglass-end", "fa-hourglass-half", "fa-hourglass-start", "fa-house-damage", "fa-hryvnia",
    "fa-i-cursor", "fa-ice-cream", "fa-icicles", "fa-icons", "fa-id-badge", "fa-id-card", "fa-id-card-alt", "fa-igloo",
    "fa-image", "fa-images", "fa-inbox", "fa-indent", "fa-industry", "fa-infinity", "fa-info", "fa-info-circle",
    "fa-italic", "fa-jedi", "fa-joint", "fa-journal-whills", "fa-kaaba", "fa-key", "fa-keyboard", "fa-khanda",
    "fa-kiss", "fa-kiss-beam", "fa-kiss-wink-heart", "fa-kiwi-bird", "fa-landmark", "fa-language", "fa-laptop", "fa-laptop-code",
    "fa-laptop-medical", "fa-laugh", "fa-laugh-beam", "fa-laugh-squint", "fa-laugh-wink", "fa-layer-group", "fa-leaf", "fa-lemon",
    "fa-less-than", "fa-less-than-equal", "fa-level-down-alt", "fa-level-up-alt", "fa-life-ring", "fa-lightbulb", "fa-link", "fa-lira-sign",
    "fa-list", "fa-list-alt", "fa-list-ol", "fa-list-ul", "fa-location-arrow", "fa-lock", "fa-lock-open", "fa-long-arrow-alt-down",
    "fa-long-arrow-alt-left", "fa-long-arrow-alt-right", "fa-long-arrow-alt-up", "fa-low-vision", "fa-luggage-cart", "fa-magic", "fa-magnet", "fa-mail-bulk",
    "fa-male", "fa-map", "fa-map-marked", "fa-map-marked-alt", "fa-map-marker", "fa-map-marker-alt", "fa-map-pin", "fa-map-signs",
    "fa-marker", "fa-mars", "fa-mars-double", "fa-mars-stroke", "fa-mars-stroke-h", "fa-mars-stroke-v", "fa-mask", "fa-medal",
    "fa-medkit", "fa-meh", "fa-meh-blank", "fa-meh-rolling-eyes", "fa-memory", "fa-menorah", "fa-mercury", "fa-meteor",
    "fa-microchip", "fa-microphone", "fa-microphone-alt", "fa-microphone-alt-slash", "fa-microphone-slash", "fa-microscope", "fa-minus", "fa-minus-circle",
    "fa-minus-square", "fa-mitten", "fa-mobile", "fa-mobile-alt", "fa-money-bill", "fa-money-bill-alt", "fa-money-bill-wave", "fa-money-bill-wave-alt",
    "fa-money-check", "fa-money-check-alt", "fa-monument", "fa-moon", "fa-mortar-pestle", "fa-mosque", "fa-motorcycle", "fa-mountain",
    "fa-mouse", "fa-mouse-pointer", "fa-mug-hot", "fa-music", "fa-network-wired", "fa-neuter", "fa-newspaper", "fa-not-equal",
    "fa-notes-medical", "fa-object-group", "fa-object-ungroup", "fa-oil-can", "fa-om", "fa-otter", "fa-outdent", "fa-pager",
    "fa-paint-brush", "fa-paint-roller", "fa-palette", "fa-pallet", "fa-paper-plane", "fa-paperclip", "fa-parachute-box", "fa-paragraph",
    "fa-parking", "fa-passport", "fa-pastafarianism", "fa-paste", "fa-pause", "fa-pause-circle", "fa-paw", "fa-peace",
    "fa-pen", "fa-pen-alt", "fa-pen-fancy", "fa-pen-nib", "fa-pen-square", "fa-pencil-alt", "fa-pencil-ruler", "fa-people-carry",
    "fa-pepper-hot", "fa-percent", "fa-percentage", "fa-person-booth", "fa-phone", "fa-phone-alt", "fa-phone-slash", "fa-phone-square",
    "fa-phone-square-alt", "fa-phone-volume", "fa-photo-video", "fa-piggy-bank", "fa-pills", "fa-pizza-slice", "fa-place-of-worship", "fa-plane",
    "fa-plane-arrival", "fa-plane-departure", "fa-play", "fa-play-circle", "fa-plug", "fa-plus", "fa-plus-circle", "fa-plus-square",
    "fa-podcast", "fa-poll", "fa-poll-h", "fa-poo", "fa-poo-storm", "fa-poop", "fa-portrait", "fa-pound-sign",
    "fa-power-off", "fa-pray", "fa-praying-hands", "fa-prescription", "fa-prescription-bottle", "fa-prescription-bottle-alt", "fa-print", "fa-procedures",
    "fa-project-diagram", "fa-puzzle-piece", "fa-qrcode", "fa-question", "fa-question-circle", "fa-quidditch", "fa-quote-left", "fa-quote-right",
    "fa-quran", "fa-radiation", "fa-radiation-alt", "fa-rainbow", "fa-random", "fa-receipt", "fa-record-vinyl", "fa-recycle",
    "fa-redo", "fa-redo-alt", "fa-registered", "fa-remove-format", "fa-reply", "fa-reply-all", "fa-republican", "fa-restroom",
    "fa-retweet", "fa-ribbon", "fa-ring", "fa-road", "fa-robot", "fa-rocket", "fa-route", "fa-rss",
    "fa-rss-square", "fa-ruble-sign", "fa-ruler", "fa-ruler-combined", "fa-ruler-horizontal", "fa-ruler-vertical", "fa-running", "fa-rupee-sign",
    "fa-sad-cry", "fa-sad-tear", "fa-satellite", "fa-satellite-dish", "fa-save", "fa-school", "fa-screwdriver", "fa-scroll",
    "fa-sd-card", "fa-search", "fa-search-dollar", "fa-search-location", "fa-search-minus", "fa-search-plus", "fa-seedling", "fa-server",
    "fa-shapes", "fa-share", "fa-share-alt", "fa-share-alt-square", "fa-share-square", "fa-shekel-sign", "fa-shield-alt", "fa-ship",
    "fa-shipping-fast", "fa-shoe-prints", "fa-shopping-bag", "fa-shopping-basket", "fa-shopping-cart", "fa-shower", "fa-shuttle-van", "fa-sign",
    "fa-sign-in-alt", "fa-sign-language", "fa-sign-out-alt", "fa-signal", "fa-signature", "fa-sim-card", "fa-sitemap", "fa-skating",
    "fa-skiing", "fa-skiing-nordic", "fa-skull", "fa-skull-crossbones", "fa-slash", "fa-sleigh", "fa-sliders-h", "fa-smile",
    "fa-smile-beam", "fa-smile-wink", "fa-smog", "fa-smoking", "fa-smoking-ban", "fa-sms", "fa-snowboarding", "fa-snowflake",
    "fa-snowman", "fa-snowplow", "fa-socks", "fa-solar-panel", "fa-sort", "fa-sort-alpha-down", "fa-sort-alpha-down-alt", "fa-sort-alpha-up",
    "fa-sort-alpha-up-alt", "fa-sort-amount-down", "fa-sort-amount-down-alt", "fa-sort-amount-up", "fa-sort-amount-up-alt", "fa-sort-down", "fa-sort-numeric-down", "fa-sort-numeric-down-alt",
    "fa-sort-numeric-up", "fa-sort-numeric-up-alt", "fa-sort-up", "fa-spa", "fa-space-shuttle", "fa-spell-check", "fa-spider", "fa-spinner",
    "fa-splotch", "fa-spray-can", "fa-square", "fa-square-full", "fa-square-root-alt", "fa-stamp", "fa-star", "fa-star-and-crescent",
    "fa-star-half", "fa-star-half-alt", "fa-star-of-david", "fa-star-of-life", "fa-step-backward", "fa-step-forward", "fa-stethoscope", "fa-sticky-note",
    "fa-stop", "fa-stop-circle", "fa-stopwatch", "fa-store", "fa-store-alt", "fa-stream", "fa-street-view", "fa-strikethrough",
    "fa-stroopwafel", "fa-subscript", "fa-subway", "fa-suitcase", "fa-suitcase-rolling", "fa-sun", "fa-superscript", "fa-surprise",
    "fa-swatchbook", "fa-swimmer", "fa-swimming-pool", "fa-synagogue", "fa-sync", "fa-sync-alt", "fa-syringe", "fa-table",
    "fa-table-tennis", "fa-tablet", "fa-tablet-alt", "fa-tablets", "fa-tachometer-alt", "fa-tag", "fa-tags", "fa-tape",
    "fa-tasks", "fa-taxi", "fa-teeth", "fa-teeth-open", "fa-temperature-high", "fa-temperature-low", "fa-tenge", "fa-terminal",
    "fa-text-height", "fa-text-width", "fa-th", "fa-th-large", "fa-th-list", "fa-theater-masks", "fa-thermometer", "fa-thermometer-empty",
    "fa-thermometer-full", "fa-thermometer-half", "fa-thermometer-quarter", "fa-thermometer-three-quarters", "fa-thumbs-down", "fa-thumbs-up", "fa-thumbtack", "fa-ticket-alt",
    "fa-times", "fa-times-circle", "fa-tint", "fa-tint-slash", "fa-tired", "fa-toggle-off", "fa-toggle-on", "fa-toilet",
    "fa-toilet-paper", "fa-toolbox", "fa-tools", "fa-tooth", "fa-torah", "fa-torii-gate", "fa-tractor", "fa-trademark",
    "fa-traffic-light", "fa-train", "fa-tram", "fa-transgender", "fa-transgender-alt", "fa-trash", "fa-trash-alt", "fa-trash-restore",
    "fa-trash-restore-alt", "fa-tree", "fa-trophy", "fa-truck", "fa-truck-loading", "fa-truck-monster", "fa-truck-moving", "fa-truck-pickup",
    "fa-tshirt", "fa-tty", "fa-tv", "fa-umbrella", "fa-umbrella-beach", "fa-underline", "fa-undo", "fa-undo-alt",
    "fa-universal-access", "fa-university", "fa-unlink", "fa-unlock", "fa-unlock-alt", "fa-upload", "fa-user", "fa-user-alt",
    "fa-user-alt-slash", "fa-user-astronaut", "fa-user-check", "fa-user-circle", "fa-user-clock", "fa-user-cog", "fa-user-edit", "fa-user-friends",
    "fa-user-graduate", "fa-user-injured", "fa-user-lock", "fa-user-md", "fa-user-minus", "fa-user-ninja", "fa-user-nurse", "fa-user-plus",
    "fa-user-secret", "fa-user-shield", "fa-user-slash", "fa-user-tag", "fa-user-tie", "fa-user-times", "fa-users", "fa-users-cog",
    "fa-utensil-spoon", "fa-utensils", "fa-vector-square", "fa-venus", "fa-venus-double", "fa-venus-mars", "fa-vial", "fa-vials",
    "fa-video", "fa-video-slash", "fa-vihara", "fa-voicemail", "fa-volleyball-ball", "fa-volume-down", "fa-volume-mute", "fa-volume-off",
    "fa-volume-up", "fa-vote-yea", "fa-vr-cardboard", "fa-walking", "fa-wallet", "fa-warehouse", "fa-water", "fa-wave-square",
    "fa-weight", "fa-weight-hanging", "fa-wheelchair", "fa-wifi", "fa-wind", "fa-window-close", "fa-window-maximize", "fa-window-minimize",
    "fa-window-restore", "fa-wine-bottle", "fa-wine-glass", "fa-wine-glass-alt", "fa-won-sign", "fa-wrench", "fa-x-ray", "fa-yen-sign",
    "fa-yin-yang"
  ],
  init() {
    this.render();
  },
  checkLayout() {
    const c = document.getElementById("shortcut-container");
    if (!c || c.classList.contains("widget-hidden")) return;
    requestAnimationFrame(() => {
      setTimeout(() => {
        const itemCount = this.items.length;
        if (itemCount === 0) {
          c.classList.remove("shortcut-list-view");
          return;
        }
        const rect = c.getBoundingClientRect();
        const containerTop = rect.top + window.scrollY;
        const containerWidth = rect.width || (window.innerWidth - 100);
        const style = window.getComputedStyle(c);
        const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) || 100;
        const availableWidth = containerWidth - paddingX;
        const itemWidth = 140;
        const gap = 15;
        const itemsPerRow = Math.max(1, Math.floor((availableWidth + gap) / (itemWidth + gap)));
        const rowCount = Math.ceil(itemCount / itemsPerRow);
        const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--widget-scale')) || 1;
        const squareGridHeight = (rowCount * 84 + (rowCount - 1) * gap) * scale;
        const absoluteBottom = containerTop + squareGridHeight;
        const threshold = window.innerHeight - 100;
        const needsListView = absoluteBottom > threshold || window.innerHeight < 450;
        const isCurrentlyList = c.classList.contains("shortcut-list-view");
        if (needsListView !== isCurrentlyList) {
          if (needsListView) c.classList.add("shortcut-list-view");
          else c.classList.remove("shortcut-list-view");
        }
      }, 50);
    });
  },
  render() {
    const c = document.getElementById("shortcut-container");
    if (!c) return;
    c.classList.add("grid-layout");
    this.checkLayout();
    c.innerHTML = "";
    this.items.forEach((s, i) => {
      let hostname = "";
      const finalUrl = s.url.startsWith("http") ? s.url : `http://${s.url}`;
      try {
        hostname = new URL(finalUrl).hostname;
      } catch (e) {
        hostname = s.url;
      }
      const div = document.createElement("a");
      div.className = "shortcut-item";
      div.onclick = (e) =>
        this.isDragging
          ? (e.preventDefault(), (this.isDragging = false))
          : window.open(finalUrl, "_blank");
      div.oncontextmenu = (e) => showContextMenu(e, "shortcut", i);

      let iconHtml = "";
      if (s.icon) {
        if (s.icon.startsWith("http") || s.icon.startsWith("data:")) {
          iconHtml = `<img src="${s.icon}" class="shortcut-img">`;
        } else if (s.icon.startsWith("fa-") || s.icon.startsWith("fas ") || s.icon.startsWith("fab ") || s.icon.startsWith("far ")) {
          const iconClass = s.icon.includes("fa-") && !s.icon.includes(" ") ? `fas ${s.icon}` : s.icon;
          iconHtml = `<div class="shortcut-default-icon" style="display: flex;"><i class="${iconClass}"></i></div>`;
        } else {
          iconHtml = `
            <img src="https://icons.duckduckgo.com/ip3/${hostname}.ico" 
                 class="shortcut-img"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="shortcut-default-icon" style="display: none;"><i class="fas fa-link"></i></div>
          `;
        }
      } else {
        iconHtml = `
          <img src="https://icons.duckduckgo.com/ip3/${hostname}.ico" 
               class="shortcut-img"
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div class="shortcut-default-icon" style="display: none;"><i class="fas fa-link"></i></div>
        `;
      }

      div.innerHTML = `
        <div class="shortcut-icon-wrapper">
          ${iconHtml}
        </div>
        <span>${s.name}</span>
      `;
      c.appendChild(div);
    });
    if (!this.resizeListenerAdded) {
      window.addEventListener("resize", () => {
        if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => this.checkLayout(), 150);
      });
      window.addEventListener("scroll", () => {
        if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => this.checkLayout(), 100);
      });
      this.resizeListenerAdded = true;
    }
    if (window.shortcutSortable) window.shortcutSortable.destroy();
    window.shortcutSortable = new Sortable(c, {
      animation: 150,
      ghostClass: "shortcut-ghost",
      chosenClass: "sortable-chosen",
      forceFallback: false,
      onStart: () => {
        this.isDragging = true;
        c.classList.add("sorting-active");
      },
      onEnd: (evt) => {
        setTimeout(() => (this.isDragging = false), 100);
        c.classList.remove("sorting-active");
        if (evt.oldIndex !== evt.newIndex) {
          const item = this.items.splice(evt.oldIndex, 1)[0];
          this.items.splice(evt.newIndex, 0, item);
          utils.saveData();
          this.checkLayout();
        }
      },
    });
  },
  openModal(index = null) {
    window.currentShortcutIndex = index;
    const T = i18n.langData,
      isEdit = index !== null;
    document.getElementById("siteName").value = isEdit
      ? this.items[index].name
      : "";
    document.getElementById("siteUrl").value = isEdit
      ? this.items[index].url
      : "";
    document.getElementById("siteIcon").value = isEdit
      ? (this.items[index].icon || "")
      : "";
    document.getElementById("linkModalTitle").innerText = isEdit
      ? T.modalLinkEdit
      : T.modalLinkAdd;
    document.getElementById("linkSaveBtn").innerText = isEdit
      ? T.btnEdit
      : T.btnSave;
    const dBtn = document.getElementById("linkDelBtn");
    if (dBtn) dBtn.style.display = isEdit ? "block" : "none";
    
    // Reset picker
    const picker = document.getElementById("iconPickerArea");
    if (picker) {
      picker.classList.remove("show");
    }
    const searchInput = document.getElementById("iconSearchInput");
    if (searchInput) searchInput.value = "";
    
    this.updatePreview();
    utils.closeModal("settingModal");
    utils.openModal("linkModal");
    setTimeout(() => document.getElementById("siteName").focus(), 50);
  },
  toggleIconPicker() {
    const area = document.getElementById("iconPickerArea");
    if (!area) return;
    const isShowing = area.classList.contains("show");
    if (isShowing) {
      area.classList.remove("show");
    } else {
      this.renderIconList();
      area.classList.add("show");
      setTimeout(() => document.getElementById("iconSearchInput")?.focus(), 50);
    }
  },
  renderIconList(filter = "") {
    const grid = document.getElementById("iconGrid");
    if (!grid) return;
    grid.innerHTML = "";
    const filtered = filter 
      ? this.popularIcons.filter(icon => icon.includes(filter.toLowerCase())) 
      : this.popularIcons;
    
    if (filtered.length === 0) {
      const msg = document.createElement("div");
      msg.style.cssText = "grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #94a3b8; font-size: 0.85rem; padding: 20px 0; gap: 10px;";
      msg.innerHTML = `<i class="fas fa-search" style="font-size: 1.5rem; opacity: 0.2;"></i><span>${i18n.get("msgNoResults")}</span>`;
      grid.appendChild(msg);
      return;
    }

    filtered.forEach(icon => {
      const div = document.createElement("div");
      div.style.cssText = "display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:8px; background:rgba(255,255,255,0.05); cursor:pointer; transition:0.2s; border:1px solid transparent; flex-shrink:0;";
      const iconClass = icon.includes(" ") ? icon : `fas ${icon}`;
      div.innerHTML = `<i class=\"${iconClass}\" style=\"font-size: 0.95rem; opacity: 0.8;\"></i>`;
      div.onmouseenter = () => {
        div.style.background = "rgba(255,255,255,0.1)";
        div.style.borderColor = "var(--accent-color)";
      };
      div.onmouseleave = () => {
        div.style.background = "rgba(255,255,255,0.05)";
        div.style.borderColor = "transparent";
      };
      div.onclick = () => this.selectIcon(icon);
      grid.appendChild(div);
    });
  },
  filterIcons(val) {
    this.renderIconList(val);
  },
  selectIcon(icon) {
    document.getElementById("siteIcon").value = icon;
    this.updatePreview();
    const area = document.getElementById("iconPickerArea");
    if (area) {
      area.classList.remove("show");
    }
  },
  add() {
    const n = document.getElementById("siteName").value,
      u = document.getElementById("siteUrl").value,
      ic = document.getElementById("siteIcon").value;
    if (n && u) {
      const item = { name: n, url: u, icon: ic };
      if (window.currentShortcutIndex !== null)
        this.items[window.currentShortcutIndex] = item;
      else this.items.push(item);
      window.shortcuts = this.items;
      this.render();
      utils.saveData();
      utils.closeModal("linkModal");
    } else {
      if (!n) {
        utils.showValidationTip("linkSaveBtn", i18n.get("msgInputName"));
      } else if (!u) {
        utils.showValidationTip("linkSaveBtn", i18n.get("msgInputUrl"));
      }
    }
  },
  updatePreview() {
    const val = document.getElementById("siteIcon").value;
    const preview = document.getElementById("iconPreview");
    if (!preview) return;
    if (!val) {
      preview.innerHTML = '<i class="fas fa-icons" style="opacity: 0.5;"></i>';
      return;
    }
    if (val.startsWith("http") || val.startsWith("data:")) {
      preview.innerHTML = `<img src="${val}" style="width:100%; height:100%; object-fit:cover;">`;
    } else if (val.startsWith("fa-") || val.startsWith("fas ") || val.startsWith("fab ") || val.startsWith("far ")) {
      const iconClass = val.includes("fa-") && !val.includes(" ") ? `fas ${val}` : val;
      preview.innerHTML = `<i class="${iconClass}"></i>`;
    } else {
      preview.innerHTML = '<i class="fas fa-icons" style="opacity: 0.5;"></i>';
    }
  },
  handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 200 * 1024) { // 200KB limit for localStorage safety
      alert("파일 크기가 너무 큽니다. 200KB 이하의 이미지를 사용해 주세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      document.getElementById("siteIcon").value = event.target.result;
      this.updatePreview();
    };
    reader.readAsDataURL(file);
  },
  delete(index) {
    this.items.splice(index, 1);
    this.render();
    utils.saveData();
  },
};
window.shortcutMod = shortcutMod;
window.shortcuts = shortcutMod.items;
window.renderShortcuts = shortcutMod.render.bind(shortcutMod);
window.openLinkModal = shortcutMod.openModal.bind(shortcutMod);
window.addShortcut = shortcutMod.add.bind(shortcutMod);
