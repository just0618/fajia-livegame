const BOARD_CELLS = [
  {
    "id": 0,
    "x": 33.33,
    "y": 15.37,
    "type": "start",
    "title": "起点",
    "text": "石头剪刀布，赢家先走，并获得“免做任务卡”。",
    "steps": 0,
    "requirements": [],
    "allowSkip": false
  },
  {
    "id": 1,
    "x": 38.52,
    "y": 15.37,
    "type": "task",
    "title": "点赞列表",
    "text": "给对方看小号的点赞列表",
    "steps": 0,
    "requirements": [
      "手机"
    ],
    "allowSkip": true
  },
  {
    "id": 2,
    "x": 43.7,
    "y": 15.37,
    "type": "task",
    "title": "吹头发并发视频",
    "text": "给对方吹头发并拍照拍视频发到社交平台",
    "steps": 0,
    "requirements": [
      "吹风机",
      "手机"
    ],
    "allowSkip": true
  },
  {
    "id": 3,
    "x": 48.89,
    "y": 15.37,
    "type": "task",
    "title": "狠狠打一下",
    "text": "狠狠打对方一下",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 4,
    "x": 54.07,
    "y": 15.37,
    "type": "task",
    "title": "切换BGM",
    "text": "切换BGM，在音乐软件搜索炒菜歌单并播放",
    "steps": 0,
    "requirements": [
      "手机",
      "音乐软件"
    ],
    "allowSkip": true
  },
  {
    "id": 5,
    "x": 59.26,
    "y": 15.37,
    "type": "backward",
    "title": "后退一格",
    "text": "后退一格",
    "steps": 1,
    "requirements": [],
    "allowSkip": false
  },
  {
    "id": 6,
    "x": 64.44,
    "y": 15.37,
    "type": "task",
    "title": "最近的幸福",
    "text": "最近对方最让自己感到幸福的事情",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 7,
    "x": 69.63,
    "y": 15.37,
    "type": "task",
    "title": "心跳上升10",
    "text": "一分钟之内让对方的心跳上升10",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 8,
    "x": 74.81,
    "y": 15.37,
    "type": "task",
    "title": "最近的生气",
    "text": "最近对方最让自己感到生气的事情",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 9,
    "x": 80.0,
    "y": 15.37,
    "type": "backward",
    "title": "后退两格",
    "text": "后退2格",
    "steps": 2,
    "requirements": [],
    "allowSkip": false
  },
  {
    "id": 10,
    "x": 85.19,
    "y": 15.37,
    "type": "task",
    "title": "情侣不倒翁",
    "text": "情侣不倒翁挑战",
    "steps": 0,
    "requirements": [
      "安全空地"
    ],
    "allowSkip": true
  },
  {
    "id": 11,
    "x": 91.2,
    "y": 19.03,
    "type": "backward",
    "title": "后退一格",
    "text": "后退一格",
    "steps": 1,
    "requirements": [],
    "allowSkip": false
  },
  {
    "id": 12,
    "x": 91.2,
    "y": 27.82,
    "type": "task",
    "title": "三个缺点",
    "text": "说出对方三个缺点（自然流淌版）",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 13,
    "x": 91.2,
    "y": 36.6,
    "type": "task",
    "title": "抱枕推手",
    "text": "躺在抱枕上玩推手游戏，看谁能把对方推倒",
    "steps": 0,
    "requirements": [
      "抱枕"
    ],
    "allowSkip": true
  },
  {
    "id": 14,
    "x": 91.2,
    "y": 45.39,
    "type": "task",
    "title": "做一件家务",
    "text": "立刻去做一件家务",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 15,
    "x": 91.2,
    "y": 54.17,
    "type": "task",
    "title": "听心跳30秒",
    "text": "听对方心跳30秒",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 16,
    "x": 91.2,
    "y": 62.96,
    "type": "task",
    "title": "额头对额头",
    "text": "额头对额头对视10秒",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 17,
    "x": 91.2,
    "y": 71.74,
    "type": "task",
    "title": "咬手指头",
    "text": "咬对方的手指头",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 18,
    "x": 91.2,
    "y": 76.87,
    "type": "forward",
    "title": "前进两格",
    "text": "前进2格",
    "steps": 2,
    "requirements": [],
    "allowSkip": false
  },
  {
    "id": 19,
    "x": 87.5,
    "y": 82.87,
    "type": "task",
    "title": "涂护手霜",
    "text": "帮对方涂护手霜",
    "steps": 0,
    "requirements": [
      "护手霜"
    ],
    "allowSkip": true
  },
  {
    "id": 20,
    "x": 82.5,
    "y": 82.87,
    "type": "task",
    "title": "炒菜暧昧歌单",
    "text": "建一个炒菜暧昧歌单，一人往里面放一首歌",
    "steps": 0,
    "requirements": [
      "手机",
      "音乐软件"
    ],
    "allowSkip": true
  },
  {
    "id": 21,
    "x": 77.5,
    "y": 82.87,
    "type": "task",
    "title": "什么会让你生气",
    "text": "对方做什么会让你很生气（自然描述版）",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 22,
    "x": 72.5,
    "y": 82.87,
    "type": "task",
    "title": "比腿力气",
    "text": "面对面坐在椅子上用腿比谁力气大",
    "steps": 0,
    "requirements": [
      "稳固椅子"
    ],
    "allowSkip": true
  },
  {
    "id": 23,
    "x": 67.5,
    "y": 82.87,
    "type": "forward",
    "title": "前进两格",
    "text": "前进2格",
    "steps": 2,
    "requirements": [],
    "allowSkip": false
  },
  {
    "id": 24,
    "x": 62.5,
    "y": 82.87,
    "type": "task",
    "title": "口红写缩写",
    "text": "用口红在对方脸上写自己的名字缩写",
    "steps": 0,
    "requirements": [
      "口红",
      "卸妆用品"
    ],
    "allowSkip": true
  },
  {
    "id": 25,
    "x": 57.5,
    "y": 82.87,
    "type": "task",
    "title": "咬出牙印",
    "text": "咬出牙印（留痕版）",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 26,
    "x": 52.5,
    "y": 82.87,
    "type": "task",
    "title": "公主抱",
    "text": "公主抱10秒",
    "steps": 0,
    "requirements": [
      "安全空地"
    ],
    "allowSkip": true
  },
  {
    "id": 27,
    "x": 47.5,
    "y": 82.87,
    "type": "task",
    "title": "咬锁骨",
    "text": "咬对方的锁骨",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 28,
    "x": 42.5,
    "y": 82.87,
    "type": "task",
    "title": "三个优点",
    "text": "说出对方三个优点（自然描述版）",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 29,
    "x": 37.5,
    "y": 82.87,
    "type": "task",
    "title": "做一件家务",
    "text": "立刻去做一件家务",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 30,
    "x": 32.5,
    "y": 82.87,
    "type": "task",
    "title": "数腹肌",
    "text": "数对方腹肌",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 31,
    "x": 32.5,
    "y": 72.62,
    "type": "task",
    "title": "唇语告诉对方",
    "text": "看着对方的眼睛，用唇语告诉对方现在最想做什么？",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 32,
    "x": 32.5,
    "y": 62.37,
    "type": "task",
    "title": "趴到下一轮",
    "text": "趴在对方身上直到下一轮",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 33,
    "x": 32.5,
    "y": 52.12,
    "type": "task",
    "title": "最想要的礼物",
    "text": "最想要什么礼物，不能说随便",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 34,
    "x": 32.5,
    "y": 41.87,
    "type": "backward",
    "title": "后退两格",
    "text": "后退2格",
    "steps": 2,
    "requirements": [],
    "allowSkip": false
  },
  {
    "id": 35,
    "x": 32.5,
    "y": 31.63,
    "type": "task",
    "title": "健身并拍vlog",
    "text": "陪对方去健身一次并拍vlog",
    "steps": 0,
    "requirements": [
      "运动手环",
      "手机"
    ],
    "allowSkip": true
  },
  {
    "id": 36,
    "x": 32.5,
    "y": 25.77,
    "type": "task",
    "title": "弹鼻头",
    "text": "给对方弹鼻头",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 37,
    "x": 38.06,
    "y": 25.77,
    "type": "task",
    "title": "最好看的造型",
    "text": "认为对方最好看的一套造型",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 38,
    "x": 43.15,
    "y": 25.77,
    "type": "forward",
    "title": "前进三格",
    "text": "前进3格",
    "steps": 3,
    "requirements": [],
    "allowSkip": false
  },
  {
    "id": 39,
    "x": 48.24,
    "y": 25.77,
    "type": "task",
    "title": "最有用的观点",
    "text": "分享一个对你最有用的观点",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 40,
    "x": 53.33,
    "y": 25.77,
    "type": "task",
    "title": "最感动的一件事",
    "text": "对方做过最让自己感动的一件事",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 41,
    "x": 58.43,
    "y": 25.77,
    "type": "task",
    "title": "Timing对视挑战",
    "text": "搜索歌曲 Timing 으네 /DAUL，在BGM下十指紧扣对视30秒",
    "steps": 0,
    "requirements": [
      "手机",
      "音乐软件"
    ],
    "allowSkip": true
  },
  {
    "id": 42,
    "x": 63.52,
    "y": 25.77,
    "type": "forward",
    "title": "前进四格",
    "text": "前进4格",
    "steps": 4,
    "requirements": [],
    "allowSkip": false
  },
  {
    "id": 43,
    "x": 68.61,
    "y": 25.77,
    "type": "task",
    "title": "咬耳朵",
    "text": "咬对方的耳朵",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 44,
    "x": 73.7,
    "y": 25.77,
    "type": "task",
    "title": "理想恋爱关系",
    "text": "说一段你心中理想的恋爱关系",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 45,
    "x": 78.8,
    "y": 25.77,
    "type": "task",
    "title": "生气时怎么哄",
    "text": "生气的时候希望对方怎么哄你",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 46,
    "x": 83.89,
    "y": 25.77,
    "type": "task",
    "title": "睡不着在想什么",
    "text": "上一次睡不着的时候是在想什么",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 47,
    "x": 83.89,
    "y": 35.14,
    "type": "task",
    "title": "搭腿到下一轮",
    "text": "把腿搭到对方腿上直到下一轮",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 48,
    "x": 83.89,
    "y": 44.36,
    "type": "backward",
    "title": "后退一格",
    "text": "后退一格",
    "steps": 1,
    "requirements": [],
    "allowSkip": false
  },
  {
    "id": 49,
    "x": 83.89,
    "y": 53.59,
    "type": "task",
    "title": "什么会让你受不了",
    "text": "对方做什么会让自己受不了",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 50,
    "x": 83.89,
    "y": 62.81,
    "type": "task",
    "title": "手心写字",
    "text": "一方蒙眼，另一方在对方手心里写字让他猜",
    "steps": 0,
    "requirements": [
      "眼罩"
    ],
    "allowSkip": true
  },
  {
    "id": 51,
    "x": 83.89,
    "y": 72.04,
    "type": "task",
    "title": "发一句微博",
    "text": "在对方微博上发一句话",
    "steps": 0,
    "requirements": [
      "手机",
      "微博"
    ],
    "allowSkip": true
  },
  {
    "id": 52,
    "x": 78.7,
    "y": 73.65,
    "type": "task",
    "title": "狠狠打一下",
    "text": "狠狠打对方一下",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 53,
    "x": 73.15,
    "y": 73.65,
    "type": "task",
    "title": "难过时想要什么",
    "text": "难过时想被拥抱还是被安慰",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 54,
    "x": 67.59,
    "y": 73.65,
    "type": "task",
    "title": "床头娃娃",
    "text": "送对方一个床头娃娃",
    "steps": 0,
    "requirements": [
      "床头娃娃"
    ],
    "allowSkip": true
  },
  {
    "id": 55,
    "x": 62.04,
    "y": 73.65,
    "type": "forward",
    "title": "前进一格",
    "text": "前进1格",
    "steps": 1,
    "requirements": [],
    "allowSkip": false
  },
  {
    "id": 56,
    "x": 56.48,
    "y": 73.65,
    "type": "task",
    "title": "拿走几件东西",
    "text": "投中的点是几，就在对方身上拿走几件东西",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 57,
    "x": 50.93,
    "y": 73.65,
    "type": "task",
    "title": "脸贴脸",
    "text": "脸贴脸10秒",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 58,
    "x": 45.37,
    "y": 73.65,
    "type": "task",
    "title": "家里添置物品",
    "text": "觉得目前家里最需要添置的一件物品",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 59,
    "x": 39.81,
    "y": 73.65,
    "type": "task",
    "title": "耳边吹气",
    "text": "在对方耳边吹气5秒",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 60,
    "x": 39.17,
    "y": 63.54,
    "type": "backward",
    "title": "后退两格",
    "text": "后退2格",
    "steps": 2,
    "requirements": [],
    "allowSkip": false
  },
  {
    "id": 61,
    "x": 39.17,
    "y": 53.44,
    "type": "task",
    "title": "什么会让你难过",
    "text": "对方说什么会让自己难过",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 62,
    "x": 39.17,
    "y": 43.34,
    "type": "task",
    "title": "挽留还是尊重",
    "text": "要离开是会拦住对方还是尊重对方",
    "steps": 0,
    "requirements": [],
    "allowSkip": true
  },
  {
    "id": 63,
    "x": 39.17,
    "y": 33.67,
    "type": "finish",
    "title": "终点",
    "text": "最先到终点者获得“万能卡”1张，可指定对方为自己做任何一件事。",
    "steps": 0,
    "requirements": [],
    "allowSkip": false
  }
];
