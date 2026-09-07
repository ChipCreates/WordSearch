import type { FoundLine } from "../constants";
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const noise = (n: number) => { const v = Math.sin(n*127.1+31.7)*43758.5453; return v-Math.floor(v); };
// Enlarge the effects around each dot without moving their word-center anchors.
const EFFECT_SCALE = 1.8;

// Follow every collapsed word's midpoint in discovery order. Shared midpoints
// form a single visible dot, so visit them once rather than drawing zero-length links.
export function celebrationPoints(lines: FoundLine[]) {
    const points = new Map<string, { x: number; y: number }>();
    for (const line of lines) {
        const x = (line.startC + line.endC) / 2 + 0.5;
        const y = (line.startR + line.endR) / 2 + 0.5;
        points.set(`${x},${y}`, { x, y });
    }
    return [...points.values()];
}

// All dimensions are cell-relative; deterministic particles do not flicker.
export function drawConstellation(ctx: CanvasRenderingContext2D, points: ReturnType<typeof celebrationPoints>, cellSize: number, progress: number, elapsed: number) {
    if (!points.length || cellSize <= 0) return;
    const phase = clamp(progress)*Math.max(1,points.length-1), time = elapsed/1000;
    const glow = (x:number,y:number,r:number,rgb:string,alpha:number) => {
        const g = ctx.createRadialGradient(x,y,0,x,y,r);
        g.addColorStop(0,`rgba(${rgb},${alpha})`);
        g.addColorStop(0.25,`rgba(${rgb},${alpha*0.36})`);
        g.addColorStop(1,`rgba(${rgb},0)`);
        ctx.fillStyle=g; ctx.fillRect(x-r,y-r,r*2,r*2);
    };
    ctx.save(); ctx.scale(cellSize,cellSize);
    ctx.globalCompositeOperation="screen"; ctx.lineCap="round";
    for(let i=0;i<points.length-1;i++) {
        const reveal=clamp(phase-i);
        if(!reveal) continue;
        const a=points[i], b=points[i+1], dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy)||1;
        for(let strand=0;strand<7;strand++) {
            ctx.beginPath();
            for(let step=0;step<=48;step++) {
                const t=reveal*step/48;
                const sway=Math.sin(t*Math.PI*3+time*(strand%2?1:-1)+strand*1.8)*Math.sin(t*Math.PI)*(0.045+strand*0.022)*EFFECT_SCALE;
                const x=a.x+dx*t-dy/len*sway,y=a.y+dy*t+dx/len*sway;
                if(!step) ctx.moveTo(x,y); else ctx.lineTo(x,y);
            }
            ctx.strokeStyle=strand%3===0?"rgba(245,245,165,.75)":"rgba(159,245,127,.48)";
            ctx.lineWidth=(strand===0?0.012:0.005)*EFFECT_SCALE;
            ctx.shadowColor="#b6f27d"; ctx.shadowBlur=(strand===0?10:3)*EFFECT_SCALE; ctx.stroke();
        }
        ctx.shadowBlur=0;
        for(let leaf=0;leaf<22;leaf++) {
            const seed=i*31+leaf,t=(noise(seed)+time*0.045)%1;
            if(t>reveal) continue;
            const spread=(noise(seed+70)-0.5)*0.72*EFFECT_SCALE,size=(0.018+noise(seed+120)*0.031)*EFFECT_SCALE;
            ctx.save(); ctx.translate(a.x+dx*t-dy/len*spread,a.y+dy*t+dx/len*spread);
            ctx.rotate(noise(seed+90)*6.28+time*0.4);
            ctx.globalAlpha=0.3+noise(seed+150)*0.5; ctx.fillStyle="#b5df80";
            ctx.beginPath();ctx.moveTo(-size,0);
            ctx.quadraticCurveTo(0,-size,size,0);ctx.quadraticCurveTo(0,size*0.6,-size,0);ctx.fill();
            ctx.strokeStyle="#e6f3b3";ctx.lineWidth=0.003;
            ctx.beginPath();ctx.moveTo(-size,0);ctx.lineTo(size,0);ctx.stroke();ctx.restore();
        }
    }
    points.forEach((p,i)=>{
        if(i>phase) return;
        const violet=i===0||i===points.length-1,rgb=violet?"188,111,255":"151,246,115";
        ctx.save();ctx.translate(p.x,p.y);ctx.globalAlpha=clamp((phase-i)*4+0.25);
        ctx.scale(EFFECT_SCALE,EFFECT_SCALE);
        glow(0,0,0.49,rgb,0.25);
        // Light gathers at the rim, preserving the glyph through the clear lens.
        const lens=ctx.createRadialGradient(0,0,0.12,0,0,0.30);
        lens.addColorStop(0,`rgba(${rgb},0.025)`);lens.addColorStop(0.8,`rgba(${rgb},0.10)`);
        lens.addColorStop(0.96,`rgba(${rgb},0.48)`);lens.addColorStop(1,`rgba(${rgb},0)`);
        ctx.fillStyle=lens;ctx.fillRect(-0.30,-0.30,0.6,0.6);
        for(let orbit=0;orbit<4;orbit++){
            ctx.beginPath();ctx.ellipse(0,0,0.28+orbit*0.015,0.25-orbit*0.026,time*0.25+orbit*1.6,0,Math.PI*2);
            ctx.strokeStyle=`rgba(${rgb},${orbit?0.5:0.9})`;ctx.lineWidth=orbit?0.005:0.009;
            ctx.shadowColor=violet?"#ca80ff":"#afff95";ctx.shadowBlur=7*EFFECT_SCALE;ctx.stroke();
        }
        ctx.shadowBlur=0;
        for(let dot=0;dot<9;dot++){
            const angle=dot*2.399+time*(dot%2?0.6:-0.4),radius=0.29+noise(dot+i*10)*0.075;
            glow(Math.cos(angle)*radius,Math.sin(angle)*radius,0.035,rgb,0.85);
        }
        ctx.restore();
    });
    if(progress>0.55&&points.length>1){
        // Place the flare halfway along a link between collapsed word dots.
        const index=Math.floor((points.length-2)/2),a=points[index],b=points[index+1],x=(a.x+b.x)/2,y=(a.y+b.y)/2;
        ctx.globalAlpha=clamp((progress-0.55)*3)*(0.87+Math.sin(time*3)*0.13);
        glow(x,y,0.64*EFFECT_SCALE,"228,244,129",0.5);
        for(let ray=0;ray<16;ray++){
            const angle=ray*Math.PI/8+0.12,len=(0.22+noise(ray+300)*0.4)*EFFECT_SCALE;
            const ex=x+Math.cos(angle)*len,ey=y+Math.sin(angle)*len,g=ctx.createLinearGradient(x,y,ex,ey);
            g.addColorStop(0,"rgba(255,255,226,1)");g.addColorStop(1,"rgba(233,245,138,0)");
            ctx.strokeStyle=g;ctx.lineWidth=(ray%2?0.006:0.015)*EFFECT_SCALE;
            ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke();
        }
        glow(x,y,0.10*EFFECT_SCALE,"255,255,234",1);
    }
    ctx.restore();
}
