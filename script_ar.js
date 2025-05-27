
function startARGame() {
  destroyedCount = 0;
  const totalMeteors = 30;
  foundButton.style.bottom = "540px";

  document.getElementById('arScreen').classList.remove('hidden');
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(stream => {
      const video = document.getElementById('cameraFeed');
      video.srcObject = stream;
      spawnMeteors();
      watchGPSForAR();
      document.getElementById('arScreen').style.display = 'flex';
    });
}

function spawnMeteors() {
  const layer = document.getElementById('meteorLayer');
  layer.innerHTML = '';

  const maxMeteors = 30;
  let count = 0;

  const interval = setInterval(() => {
    if (count >= maxMeteors) {
      clearInterval(interval);
      return;
    }

    const meteor = document.createElement('div');
    meteor.classList.add('meteor');
    meteor.style.left = Math.random() * 80 + 'vw';
    meteor.style.top = Math.random() * 80 + 'vh';
    meteor.addEventListener('click', () => explodeMeteor(meteor));
    layer.appendChild(meteor);

    requestAnimationFrame(() => {
      meteor.classList.add('animate');
    });

    count++;
  }, 800);
}

function explodeMeteor(meteor) {
  const explosion = document.createElement('img');
  explosion.src = "./assets/폭발.png";
  explosion.className = 'explosion';
  explosion.style.left = meteor.style.left;
  explosion.style.top = meteor.style.top;

  meteor.remove();
  document.getElementById('meteorLayer').appendChild(explosion);
  destroyedCount++;

  if (destroyedCount === totalMeteors) {
    showMissionClear();
  }

  setTimeout(() => explosion.remove(), 1000);
}



function stopARGame() {
  const video = document.getElementById('cameraFeed');
  const stream = video.srcObject;

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }

  document.getElementById('arScreen').style.display = 'none';

  foundButton.classList.add("hidden");
  foundButton.classList.remove("reveal");
  
    foundButton.style.bottom = "540px";

  
  foundButton.style.width = "";
  foundButton.style.height = "";
  foundButton.style.fontSize = "";
  foundButton.style.whiteSpace = "";
}

function watchGPSForAR() {
  navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    zones.forEach(zone => {
      const dist = getDistance(lat, lon, zone.lat, zone.lon);
      if (dist < 30) {
        foundButton.classList.remove("hidden");
        foundButton.classList.add("reveal");
        planetText.innerText = zone.name;
      }
    });
  });
}

// 외부 접근 가능하게 내보냄
window.startARGame = startARGame;

// ✅ AR 화면에서 "행성 발견!" 눌렀을 때 → AR 종료 + 탐험 UI 복귀

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('arExitButton').addEventListener('click', () => {
    stopARGame();
  });
});

function showMissionClear() {
  const msg = document.createElement("div");
  msg.innerText = "🌟 미션 클리어!";
  msg.style.position = "fixed";
  msg.style.top = "40%";
  msg.style.left = "50%";
  msg.style.transform = "translate(-50%, -50%)";
  msg.style.padding = "1rem 2rem";
  msg.style.fontSize = "2rem";
  msg.style.fontWeight = "bold";
  msg.style.color = "#fff";
  msg.style.background = "rgba(0,0,0,0.8)";
  msg.style.borderRadius = "12px";
  msg.style.zIndex = "999999";

  document.body.appendChild(msg);

  setTimeout(() => {
    msg.remove();
  }, 2500);
}
