// Runtime stand-in until assets/character.png exists.
// Head center is (512, 380) on a 1024 canvas — match content.json character.headPx.

export function drawPlaceholderCharacter() {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');

  g.clearRect(0, 0, size, size);

  const cx = 512;
  const headY = 380;
  g.fillStyle = '#d8d8d8';

  g.beginPath();
  g.moveTo(cx - 220, 980);
  g.lineTo(cx - 280, 720);
  g.quadraticCurveTo(cx, 640, cx + 280, 720);
  g.lineTo(cx + 220, 980);
  g.closePath();
  g.fill();

  g.fillRect(cx - 52, 520, 104, 160);

  g.beginPath();
  g.ellipse(cx, headY, 168, 210, 0, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = '#111';
  g.beginPath();
  g.ellipse(cx - 58, headY - 12, 18, 10, 0, 0, Math.PI * 2);
  g.ellipse(cx + 58, headY - 12, 18, 10, 0, 0, Math.PI * 2);
  g.fill();

  return c;
}
