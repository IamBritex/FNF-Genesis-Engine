return {
    elements = {
        {
            key = "gfDance",
            image = "public/assets/images/states/IntroMenu/gfDanceTitle.png",
            xml = "public/assets/images/states/IntroMenu/gfDanceTitle.xml",
            animation = {
                key = "gf_dance",
                frames = { start = 0, end = 29, prefix = "gfDance", zeroPad = 4 },
                fps = 23
            },
            position = { x = 910, y = 380 },
            scale = 1
        },
        {
            key = "titleEnter",
            image = "public/assets/images/states/IntroMenu/titleEnter.png",
            xml = "public/assets/images/states/IntroMenu/titleEnter.xml",
            animations = {
                {
                    key = "enter_idle",
                    frames = { start = 0, end = 0, prefix = "ENTER IDLE000" },
                    fps = 0
                },
                {
                    key = "enter_pressed",
                    frames = { start = 0, end = 1, prefix = "ENTER PRESSED000" },
                    fps = 14
                }
            },
            position = { x = 900, y = 620 },
            scale = 1
        },
        {
            key = "logoBumpin",
            image = "public/assets/images/states/IntroMenu/logoBumpin.png",
            xml = "public/assets/images/states/IntroMenu/logoBumpin.xml",
            animation = {
                key = "logo_bumpin",
                frames = { start = 0, end = 14, prefix = "logo bumpin000" },
                fps = 23
            },
            position = { x = 340, y = 240 },
            scale = 1
        }
    }
}
