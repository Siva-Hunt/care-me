"""Care Me: draws the launcher icons and splash screens (thali plate with a leaf, on turmeric)."""
import glob, sys
from PIL import Image, ImageDraw
TUR=(244,178,35); CHILI=(200,52,31); INK=(29,26,22); LEAF=(30,142,62)
def plate(size, scale=1.0, bg=None):
    S=size*4; im=Image.new('RGBA',(S,S),bg or (0,0,0,0)); d=ImageDraw.Draw(im)
    c=S/2; R=S*0.36*scale
    d.ellipse([c-R+S*.02,c-R+S*.04,c+R+S*.02,c+R+S*.04],fill=(0,0,0,45))
    d.ellipse([c-R,c-R,c+R,c+R],fill=(255,255,255),outline=(225,214,190),width=int(S*.012))
    r=R*.30
    for (dx,dy,col) in [(-.42,-.30,TUR),(.40,-.32,CHILI),(-.02,.42,(120,170,60))]:
        x,y=c+dx*R,c+dy*R; d.ellipse([x-r,y-r,x+r,y+r],fill=col)
    # roti
    x,y=c+.38*R,c+.36*R; rr=R*.26; d.ellipse([x-rr,y-rr,x+rr,y+rr],fill=(230,190,120)); d.ellipse([x-rr*.5,y-rr*.4,x-rr*.1,y],fill=(200,150,80))
    # leaf = care
    lx,ly=c+R*.05,c-R*1.02; L2=R*.42
    d.ellipse([lx-L2*.15,ly-L2*.55,lx+L2*1.0,ly+L2*.05],fill=LEAF); d.line([(lx-L2*.1,ly+L2*.1),(lx+L2*.8,ly-L2*.4)],fill=(20,100,45),width=max(1,int(S*.008)))
    # viewfinder corners
    L=R*.35; w=int(S*.03); m=R*1.22
    for sx in (-1,1):
        for sy in (-1,1):
            x,y=c+sx*m,c+sy*m
            d.line([(x,y),(x-sx*L,y)],fill=INK,width=w); d.line([(x,y),(x,y-sy*L)],fill=INK,width=w)
    return im.resize((size,size),Image.LANCZOS)
res='android/app/src/main/res/'
for dpi,f in {'mdpi':1,'hdpi':1.5,'xhdpi':2,'xxhdpi':3,'xxxhdpi':4}.items():
    s=int(48*f); legacy=Image.new('RGBA',(s,s),(0,0,0,0)); bg=Image.new('RGBA',(s,s),TUR)
    mask=Image.new('L',(s*4,s*4),0); ImageDraw.Draw(mask).rounded_rectangle([0,0,s*4,s*4],radius=s*.9,fill=255); mask=mask.resize((s,s),Image.LANCZOS)
    legacy.paste(bg,(0,0),mask); legacy.alpha_composite(plate(s,.7))
    legacy.save(res+f'mipmap-{dpi}/ic_launcher.png')
    rm=Image.new('L',(s*4,s*4),0); ImageDraw.Draw(rm).ellipse([0,0,s*4,s*4],fill=255); rm=rm.resize((s,s),Image.LANCZOS)
    rnd=Image.new('RGBA',(s,s),(0,0,0,0)); rnd.paste(bg,(0,0),rm); rnd.alpha_composite(plate(s,.64)); rnd.save(res+f'mipmap-{dpi}/ic_launcher_round.png')
    fs=int(108*f); plate(fs,.55).save(res+f'mipmap-{dpi}/ic_launcher_foreground.png')
open(res+'values/ic_launcher_background.xml','w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#F4B223</color>\n</resources>\n')
for p in glob.glob(res+'drawable*/splash.png'):
    w,h=Image.open(p).size; sp=Image.new('RGBA',(w,h),TUR+(255,)); s=int(min(w,h)*.42); sp.alpha_composite(plate(s,.9),((w-s)//2,(h-s)//2)); sp.convert('RGB').save(p)

print('icons done')
