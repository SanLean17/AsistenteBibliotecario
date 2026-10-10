export const MAX_ASSIST_IMAGE=1600000;
export const validAssistImage=value=>typeof value==='string'&&value.length<=MAX_ASSIST_IMAGE&&/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value);
export async function prepareAssistImage(file,{rotation=0,crop=null}={}){
 if(!file||file.size>20*1024*1024||!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type))throw new Error('Elegí una foto JPG, PNG o WebP de hasta 20 MB.');
 const url=URL.createObjectURL(file);let image;
 try{image=new Image();image.src=url;await image.decode();const sw=image.naturalWidth,sh=image.naturalHeight;
  const c=crop||{x:0,y:0,width:100,height:100};if(Object.values(c).some(v=>!Number.isFinite(Number(v)))||c.x<0||c.y<0||c.width<=0||c.height<=0||+c.x+(+c.width)>100||+c.y+(+c.height)>100)throw new Error('El recorte debe quedar dentro de la imagen.');
  const w=sw*c.width/100,h=sh*c.height/100,ratio=Math.min(1,2000/Math.max(w,h)),turn=((rotation%360)+360)%360;if(![0,90,180,270].includes(turn))throw new Error('Rotación inválida.');
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round((turn%180?h:w)*ratio));canvas.height=Math.max(1,Math.round((turn%180?w:h)*ratio));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(turn*Math.PI/180);ctx.drawImage(image,sw*c.x/100,sh*c.y/100,w,h,-w*ratio/2,-h*ratio/2,w*ratio,h*ratio);
  for(const quality of [.85,.72,.58,.42]){const value=canvas.toDataURL('image/jpeg',quality);if(validAssistImage(value))return value;}throw new Error('La imagen sigue siendo muy grande. Recortá la zona de texto.');
 }catch(error){if(error.name==='EncodingError')throw new Error('No pudimos abrir la imagen. Probá con JPG o una foto nueva.');throw error;}finally{URL.revokeObjectURL(url);}
}
export async function transformAssistImage(data,options){const response=await fetch(data),blob=await response.blob();return prepareAssistImage(new File([blob],'ocr.jpg',{type:'image/jpeg'}),options);}
