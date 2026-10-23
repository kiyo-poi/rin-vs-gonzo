const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
if (ctx) {
  ctx.fillStyle = '#fff';
  ctx.font = '32px sans-serif';
  ctx.fillText('M1 準備中', 40, 60);
}
