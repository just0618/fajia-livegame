(() => {
  "use strict";

  const V = "6-20260819";
  const a = (folder, file) => `./audio/${folder}/${file}.mp3?v=${V}`;

  // source: paperfish = 纸包鱼老师原版18题；new18 = 新增18题；old621 = 曾玩过的20题锚点。
  // dup: 语义去重组。同一轮内同一个 dup 最多出现一次。
  // level: 1–4，仅用于后台控制由轻到重的节奏，前台不显示。
  window.FAJIA_TOLERANCE_QUESTIONS = [
    // A · 纸包鱼老师18题
    { id:"P01", source:"paperfish", level:3, dup:"same_drink", text:"和别人喝同一杯8+1", audio:a("paperfish","p01") },
    { id:"P02", source:"paperfish", level:2, dup:"rain_play", text:"在雨里和别人火拼", audio:a("paperfish","p02") },
    { id:"P03", source:"paperfish", level:3, dup:"share_earphones", text:"和别人共用一个耳机", audio:a("paperfish","p03") },
    { id:"P04", source:"paperfish", level:3, dup:"carry_drunk_home", text:"别人醉了以后驮他回家", audio:a("paperfish","p04") },
    { id:"P05", source:"paperfish", level:3, dup:"body_contact", text:"和别人肢体接触", audio:a("paperfish","p05") },
    { id:"P06", source:"paperfish", level:2, dup:"ebike_backseat", text:"坐在别人电瓶车后座", audio:a("paperfish","p06") },
    { id:"P07", source:"paperfish", level:4, dup:"bring_home_unannounced", text:"带别人回家且没有告诉对方", audio:a("paperfish","p07") },
    { id:"P08", source:"paperfish", level:3, dup:"feed_each_other", text:"在自己面前喂别人吃东西", audio:a("paperfish","p08") },
    { id:"P09", source:"paperfish", level:3, dup:"matching_cup_social", text:"和别人用同款漂亮杯子并拍照发社交平台", audio:a("paperfish","p09") },
    { id:"P10", source:"paperfish", level:3, dup:"ferris_wheel", text:"和别人单独坐摩天轮", audio:a("paperfish","p10") },
    { id:"P11", source:"paperfish", level:4, dup:"same_room", text:"和别人住在一个房间", audio:a("paperfish","p11") },
    { id:"P12", source:"paperfish", level:2, dup:"brother_title", text:"叫别人哥哥或弟弟", audio:a("paperfish","p12") },
    { id:"P13", source:"paperfish", level:2, dup:"special_note", text:"给别人特殊备注", audio:a("paperfish","p13") },
    { id:"P14", source:"paperfish", level:4, dup:"drunk_act_cute", text:"喝醉了给别人撒娇", audio:a("paperfish","p14") },
    { id:"P15", source:"paperfish", level:1, dup:"carry_bag", text:"帮别人背包", audio:a("paperfish","p15") },
    { id:"P16", source:"paperfish", level:2, dup:"praise_other_body", text:"在自己面前夸别的男生身材好", audio:a("paperfish","p16") },
    { id:"P17", source:"paperfish", level:2, dup:"matching_charm", text:"和别人一起用同款挂件", audio:a("paperfish","p17") },
    { id:"P18", source:"paperfish", level:2, dup:"remove_pin", text:"取消对方的置顶", audio:a("paperfish","p18") },

    // B · 新增18题
    { id:"N01", source:"new18", level:3, dup:"same_drink", text:"共用一个水杯", audio:a("new18","n01") },
    { id:"N02", source:"new18", level:4, dup:"stay_out_all_night", text:"一起夜不归宿", audio:a("new18","n02") },
    { id:"N03", source:"new18", level:3, dup:"share_earphones", text:"共用耳机听歌", audio:a("new18","n03") },
    { id:"N04", source:"new18", level:3, dup:"link_arms", text:"互相挽着胳膊", audio:a("new18","n04") },
    { id:"N05", source:"new18", level:3, dup:"dear_title", text:"叫对方亲爱的", audio:a("new18","n05") },
    { id:"N06", source:"new18", level:2, dup:"movie_together", text:"一起去看电影", audio:a("new18","n06") },
    { id:"N07", source:"new18", level:2, dup:"escort_home", text:"互送对方回家", audio:a("new18","n07") },
    { id:"N08", source:"new18", level:2, dup:"passenger_seat", text:"让对方坐副驾驶", audio:a("new18","n08") },
    { id:"N09", source:"new18", level:4, dup:"lap_rest", text:"允许对方躺腿上", audio:a("new18","n09") },
    { id:"N10", source:"new18", level:4, dup:"close_touching", text:"允许对方靠着动手动脚", audio:a("new18","n10") },
    { id:"N11", source:"new18", level:4, dup:"couple_privacy", text:"和对方分享情侣间的隐私", audio:a("new18","n11") },
    { id:"N12", source:"new18", level:4, dup:"solo_trip", text:"和对方出去旅游", audio:a("new18","n12") },
    { id:"N13", source:"new18", level:3, dup:"feed_each_other", text:"和对方互喂食物", audio:a("new18","n13") },
    { id:"N14", source:"new18", level:4, dup:"cancel_date_for_other", text:"为了对方放弃和自己的约会", audio:a("new18","n14") },
    { id:"N15", source:"new18", level:2, dup:"comfort_other", text:"对方心情不好哄对方开心", audio:a("new18","n15") },
    { id:"N16", source:"new18", level:3, dup:"frequent_chat", text:"和对方每天都聊天无话不说", audio:a("new18","n16") },
    { id:"N17", source:"new18", level:3, dup:"couple_avatar", text:"和对方用情侣头像", audio:a("new18","n17") },
    { id:"N18", source:"new18", level:2, dup:"mention_often", text:"经常把对方挂在嘴边", audio:a("new18","n18") },

    // C · 曾经玩过的20题：不做单独入口，只作为每轮少量锚点穿插
    { id:"O01", source:"old621", level:1, dup:"contact_info", text:"有联系方式", audio:a("old621","o01") },
    { id:"O02", source:"old621", level:1, dup:"greet_chat", text:"见面打招呼聊天", audio:a("old621","o02") },
    { id:"O03", source:"old621", level:1, dup:"holiday_care", text:"有一定节日关心", audio:a("old621","o03") },
    { id:"O04", source:"old621", level:1, dup:"birthday_interaction", text:"记得对方生日，会有互动", audio:a("old621","o04") },
    { id:"O05", source:"old621", level:1, dup:"moments_interaction", text:"朋友圈会有互动", audio:a("old621","o05") },
    { id:"O06", source:"old621", level:1, dup:"share_social_posts", text:"抖音、小红书会互相发一些有趣的内容", audio:a("old621","o06") },
    { id:"O07", source:"old621", level:1, dup:"group_hangout", text:"经常一起约着出去玩，但是一群人", audio:a("old621","o07") },
    { id:"O08", source:"old621", level:1, dup:"gaming_together", text:"一起打游戏", audio:a("old621","o08") },
    { id:"O09", source:"old621", level:4, dup:"cohabit_opposite_sex", text:"与异性合租", audio:a("old621","o09") },
    { id:"O10", source:"old621", level:2, dup:"solo_meal", text:"单独吃饭", audio:a("old621","o10") },
    { id:"O11", source:"old621", level:2, dup:"movie_together", text:"单独唱歌看电影", audio:a("old621","o11") },
    { id:"O12", source:"old621", level:1, dup:"music_app_follow", text:"网易云等音乐软件互相关注", audio:a("old621","o12") },
    { id:"O13", source:"old621", level:2, dup:"nickname", text:"给异性起绰号", audio:a("old621","o13") },
    { id:"O14", source:"old621", level:3, dup:"frequent_chat", text:"频繁聊天发消息", audio:a("old621","o14") },
    { id:"O15", source:"old621", level:4, dup:"solo_trip", text:"单独出去旅行", audio:a("old621","o15") },
    { id:"O16", source:"old621", level:3, dup:"same_drink", text:"喝同一杯饮料", audio:a("old621","o16") },
    { id:"O17", source:"old621", level:3, dup:"night_drinks", text:"一起晚上出去喝酒", audio:a("old621","o17") },
    { id:"O18", source:"old621", level:3, dup:"body_contact", text:"有肢体接触", audio:a("old621","o18") },
    { id:"O19", source:"old621", level:4, dup:"same_room", text:"开一间房住", audio:a("old621","o19") },
    { id:"O20", source:"old621", level:4, dup:"married_easter_egg", text:"有结婚证了（那请问我是？）", audio:a("old621","o20"), easterEgg:true }
  ];
})();
