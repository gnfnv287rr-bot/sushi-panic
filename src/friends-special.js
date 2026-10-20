// IDs are intentionally unassigned until the Owner supplies real authenticated UUIDs.
// Nicknames are playful personalization only; they never authenticate or restore accounts.
const entries=[
 ['nian','年崽',['年崽','年年','年仔'],'matcha-latte','年崽不吃的抹茶拿铁','matcha-dot','年崽：都说了不吃这个啦！','common',10,70,'奶泡轻轻盖住浓抹茶，小杯子正偷偷做鬼脸。'],
 ['orange','橘子',['橘子','橘橘'],'energy-bar','橘子徒步来点士力架吧','orange-hike','徒步能量已补充！','common',20,100,'巧克力、焦糖和小花生，装进一份原创的山野能量包装。'],
 ['rabbit','兔兔咪',['兔兔咪','兔兔'],'kohada','兔兔咪最爱的小肌鱼','pink-bunny','兔兔咪的快乐小鱼到货！','select',16,90,'银白小鱼趴在圆饭团上，粉盘子也竖起了兔耳朵。'],
 ['red','红果果',['红果果','果果'],'matcha-cake','红果果最爱的苦抹蛋糕','green-berry','今天也是苦抹脑袋！','select',18,70,'深绿苦抹与细细蛋糕层，一小朵奶油刚好。'],
 ['uu','UU',['UU','uu','ＵＵ'],'iced-americano','UU最爱的冰美式','blue-star','UU的快乐续杯成功！','common',8,70,'冰块碰到小吸管，工作日也有一口清清爽爽。'],
 ['mum','UU妈咪',['UU妈咪','uu妈咪','UU妈妈','UU妈'],'foie','UU妈咪最爱的鹅肝寿司','gold-lace','妈咪的精致下午茶时间！','treasure',24,120,'香槟金盘子托住焦香鹅肝，精致但不用赶时间。'],
 ['fitness','健身人士',['健身人士','健身人'],'beef','健身人士必吃的高蛋白炙烤牛肉','red-power','蛋白质补充成功！','common',26,120,'厚切牛肉带着轻轻焦香，今天也好好吃饭。']
];
export const friendsSpecialConfig=Object.freeze(entries.map(([id,nickname,aliases,art,name,plateId,easterEgg,rarity,fullness,points,description],i)=>Object.freeze({id,userIds:[],nickname,aliases,foodId:'friends_'+id,plateId,weight:3,pity:8,easterEgg,art,name,rarity,fullness,points,description,number:224+i})));
const normalize=value=>String(value||'').normalize('NFKC').trim().toLocaleLowerCase('en-US');
export function matchFriend(player,config=friendsSpecialConfig){return config.find(f=>f.userIds.includes(player?.id))||config.find(f=>f.aliases.some(n=>normalize(n)===normalize(player?.nickname)))||null;}
export function friendSnapshot(player){const f=matchFriend(player);return f?{friendId:f.id,foodId:f.foodId,weight:f.weight,pity:f.pity}:null;}
export const friendForFood=id=>friendsSpecialConfig.find(f=>f.foodId===id);
export const FRIEND_FOODS=Object.freeze(Object.fromEntries(friendsSpecialConfig.map(f=>[f.foodId,Object.freeze({id:f.foodId,number:f.number,name:f.name,themeId:'friends-special',category:'好友专属',categoryId:['matcha-latte','energy-bar','matcha-cake'].includes(f.art)?'sweet':'special',rarity:f.rarity,visualKey:'friend-'+f.art,fullness:f.fullness,points:f.points,allergen:f.id==='rabbit'?'fish':f.id==='red'?'egg':null,collectible:true,topping:['mum','fitness'].includes(f.id)?'seared':'',description:f.description,friendId:f.id,friendName:f.nickname,plateId:f.plateId,origin:'game-original'})])));
