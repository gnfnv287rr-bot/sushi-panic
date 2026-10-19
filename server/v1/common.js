export class HttpError extends Error{constructor(status,message,code){super(message);this.status=status;this.code=code;}}
export function nicknameValue(value){
 if(typeof value!=='string')throw new HttpError(400,'请输入昵称');
 const name=value.normalize('NFKC').trim();
 if(!/^[A-Za-z0-9\u3400-\u9fff]{2,12}$/u.test(name))throw new HttpError(400,'昵称需为2–12个中文、英文字母或数字');
 if(/傻[逼比]|操你|你妈|他妈|fuck|shit|nigg|色情|法西斯/i.test(name))throw new HttpError(400,'这个昵称不合适，请换一个');
 return name;
}
