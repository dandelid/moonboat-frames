// ========================
// 문보트 행성탐험 App 스크립트
// ========================

// 거리 계산 함수 (Haversine 공식을 사용해 위도/경도 거리 계산)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function watchGPS() {
  navigator.geolocation.watchPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      processLocation(lat, lon); // ✅ 기존 좌표 처리 로직 재활용
    },
    err => {
      console.error("GPS 에러:", err);
      statusEl.innerText = "❌ GPS 권한이 없거나 사용할 수 없음";
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 10000
    }
  );
}

// 각 구간(행성) 정보
const zones = [
  { name: "보트하우스", lat: 37.643536, lon: 126.675633, image: "" },
  { name: "평화 행성", lat: 37.642751, lon: 126.677121, image: "" },
  { name: "꽃 행성", lat: 37.641298, lon: 126.678814, image: "" },
  { name: "사랑 행성", lat: 37.639937, lon: 126.679317, image: "" },
  { name: "뽀뽀 행성", lat: 37.638252, lon: 126.677521, image: "" },
  { name: "복귀 행성", lat: 37.636910, lon: 126.677461, image: "" }
];

const boatPositions = {
  "평화 행성": { top: "24.6%", left: "43.2%" },
  "꽃 행성":   { top: "37.9%", left: "66.4%" },
  "사랑 행성": { top: "62.9%", left: "75.6%" },
  "뽀뽀 행성": { top: "80.9%", left: "50.9%" },
  "복귀 행성": { top: "95.2%", left: "46.3%" }
};


let visited = new Set();
let returnPathStarted = false;
let currentPhotoIndex = -1;

// UI 요소 참조
const statusEl = document.getElementById("status");
const planetText = document.getElementById("planetText");
const planetImage = document.getElementById("planetImage");
const planetMessage = document.getElementById("planetMessage");
const startButton = document.getElementById("startButton");
const lifejacketInfo = document.getElementById("lifejacketInfo");
const startImage = document.getElementById("startImage");
const movingBoat = document.getElementById("movingBoat");
const movingStatus = document.getElementById("movingStatus");
const foundButton = document.getElementById("foundButton");
const planetInfoBox = document.getElementById("planetInfoBox");
const planetInfoText = document.getElementById("planetInfoText");
const captureButton = document.getElementById("captureButton");
const cameraInput = document.getElementById("cameraInput");
const previewButton = document.getElementById("previewButton");
const photoPreview = document.getElementById("photoPreview");
const photoGallery = document.getElementById("photoGallery");

// =====================
// 사진 캡처 및 프레임 합성
// =====================
captureButton.addEventListener("click", () => {
  cameraInput.click();
});

cameraInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  console.log("📷 사진 파일 선택됨:", file);
  console.log("📷 currentPhotoIndex:", currentPhotoIndex);
  if (!file || currentPhotoIndex === -1) {
    console.warn("⚠️ 사진 파일 또는 인덱스 없음, 저장 중단");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    console.log("📷 사진 base64 로딩됨, merge 시작");
    mergePhotoWithFrame(e.target.result, currentPhotoIndex);
  };
  reader.readAsDataURL(file);
});

function mergePhotoWithFrame(photoDataURL, index) { // 📸 프레임 합성 및 저장 디버깅용
  console.log(`🧩 mergePhotoWithFrame(${index}) 호출됨`);
  const frameURLs = {
    1 : "./assets/frame1.png",
    2 : "./assets/frame2.png",
    3 : "./assets/frame3.png",
    4 : "./assets/frame4.png",
    5 : "./assets/frame5.png",
    6 : "./assets/frame6.png",
    7 : "./assets/frame7.png",
    8 : "./assets/frame8.png"
  };
  const frameURL = frameURLs[index];
  if (!frameURL) {
    console.error(`❌ 프레임 ${index} 없음`);
    return;
  }
  const photoImg = new Image();
  const frameImg = new Image();
  let loaded = 0;

  const checkDraw = () => {
    loaded++;
    console.log(`📥 이미지 로드됨 (${loaded}/2)`);
    if (loaded === 2) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 800;
        canvas.height = 1200;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(photoImg, 0, 0, canvas.width, canvas.height);
        ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
        const final = canvas.toDataURL("image/jpeg", 0.9);
        localStorage.setItem(`photo${index}`, final);
        console.log(`✅ photo${index} 저장 성공 (길이: ${final.length})`);
        alert(`✅ photo${index} 저장 완료`);
      } catch (err) {
        console.error("❌ 저장 중 오류 발생:", err);
      }
    }
  };

  photoImg.onload = () => {
    console.log("🟢 사용자 사진 로드됨");
    checkDraw();
  };
  frameImg.onload = () => {
    console.log("🟡 프레임 이미지 로드됨");
    checkDraw();
  };

  photoImg.onerror = () => console.error("❌ 사용자 사진 로드 실패");
  frameImg.onerror = () => console.error("❌ 프레임 이미지 로드 실패");

  photoImg.src = photoDataURL;
  frameImg.src = frameURL;
}

// =====================
// 위치 처리 및 버튼 표시 로직
// =====================


function processLocation(userLat, userLon) { // 📍 위치 인식 및 UI 업데이트
  statusEl.innerText = `현재 위치: ${userLat.toFixed(5)}, ${userLon.toFixed(5)}`;
  
  // 🔽 설명문 무조건 닫기 (구간 이동 시 강제 닫힘)
  planetInfoBox.classList.add("hidden");
  
  let inZone = false;
  let currentZoneIndex = -1;

  zones.forEach((zone, index) => {
    const distance = getDistance(userLat, userLon, zone.lat, zone.lon);
    if (distance < 30) {
      inZone = true;
      currentZoneIndex = index;

      if (!visited.has(zone.name)) {
        visited.add(zone.name);
        if (zone.name === "복귀 행성") returnPathStarted = true;
      }

      planetText.innerText = zone.name;

      // ✅ planetText 표시 여부 처리 (텍스트는 유지, 시각만 숨김)
      if (
        zone.name.includes("평화") ||
        zone.name.includes("꽃") ||
        zone.name.includes("사랑") ||
        zone.name.includes("뽀뽀") ||
        zone.name.includes("복귀")
      ) {
        planetText.style.opacity = "0";
        planetText.style.pointerEvents = "none";
      } else {
        planetText.style.opacity = "1";
        planetText.style.pointerEvents = "auto";
      }

      planetImage.style.display = zone.image ? "block" : "none";
      planetMessage.classList.remove("hidden");

      if (zone.name.includes("탑승") || zone.name.includes("보트하우스")) {
        startButton.innerText = returnPathStarted ? "🛬 도착!" : "⛵ 탑승 준비!";
        startButton.classList.remove("hidden");
        startImage.style.display = "block";
      } else {
        startButton.classList.add("hidden");
        startImage.style.display = "none";
      }
    }
  });

  if (inZone) {
    currentPhotoIndex = (currentZoneIndex >= 1 && currentZoneIndex <= 5) ?
      (returnPathStarted ? currentZoneIndex + 4 : currentZoneIndex) : -1;

    if (currentZoneIndex === 0 || zones[currentZoneIndex].name.includes("보트하우스")) {
      movingBoat.classList.add("hidden");
      planetInfoBox.classList.add("hidden");
    } else {
      movingBoat.classList.remove("hidden");
    }

    movingStatus.classList.add("hidden");

    if (currentZoneIndex >= 1 && currentZoneIndex <= 5) {
      foundButton.classList.remove("hidden");
      foundButton.classList.add("reveal");
    } else {
      foundButton.classList.add("hidden");
      foundButton.classList.remove("reveal");
    }

    document.getElementById("meteorMissionButton").classList.remove("reveal");

  } else {
    currentPhotoIndex = -1;
    planetMessage.classList.add("hidden");
    startButton.classList.add("hidden");
    lifejacketInfo.classList.add("hidden");
    startImage.style.display = "none";
    movingBoat.classList.remove("hidden");
    movingStatus.classList.remove("hidden");
    foundButton.classList.add("hidden");
    foundButton.classList.remove("reveal");
    planetInfoBox.classList.add("hidden");

    document.getElementById("meteorMissionButton").classList.add("reveal");
  }
}

startButton.addEventListener("click", () => { // ▶️ 도착 or 탑승 준비 버튼
  if (startButton.innerText.includes("도착")) {
    showFinalCollage();
  } else {
    lifejacketInfo.classList.toggle("hidden");
    startImage.style.display = lifejacketInfo.classList.contains("hidden") ? "block" : "none";
  }
});

foundButton.addEventListener("click", () => { // ℹ️ 행성 설명 및 카메라 버튼 표시
   // ✅ AR 모드일 경우 AR 종료
  const arScreen = document.getElementById("arScreen");
  if (!arScreen.classList.contains("hidden")) {
    stopARGame();
  }
  
  const mapId = "mapImage";
  const existingMap = document.getElementById(mapId);

  if (planetInfoBox.classList.contains("hidden")) {
    const currentZone = zones.find(zone => planetText.innerText.includes(zone.name));
    if (currentZone) {
      if (currentZone.name.includes("평화")) {
        planetInfoText.innerText = "여기는 평화 행성입니다.\n싸우지말고 포옹하며 사진을 찍어봅시다.";
      } else if (currentZone.name.includes("꽃")) {
        planetInfoText.innerText = "여기는 꽃 행성입니다.\n꽃받침을 만들어서 사진을 찍어봅시다.";
      } else if (currentZone.name.includes("사랑")) {
        planetInfoText.innerText = "여기는 사랑 행성입니다.\n손으로 하트를 만들어봅시다.";
      } else if (currentZone.name.includes("키스") || currentZone.name.includes("뽀뽀")) {
        planetInfoText.innerText = "여기는 뽀뽀 행성입니다.\n가족이나 연인과 키스 사진을 찍어봅시다.";
      } else if (currentZone.name.includes("복귀")) {
        planetInfoText.innerText = "여기는 복귀 행성입니다.\n여기서부터 돌아가세요.";
        captureButton.classList.add("hidden");
      }
      if (!currentZone.name.includes("복귀")) captureButton.classList.remove("hidden");

      // ✅ 지도 이미지가 없으면 추가
if (!existingMap) {
  const mapImage = document.createElement("img");
  mapImage.src = "./assets/라베니체.png";
  mapImage.alt = "라베니체 수로 지도";
  mapImage.id = mapId;

  // ✅ 여기부터 스타일 정리
  mapImage.style.width = "70%";         // 부모 기준 꽉 채우기
  mapImage.style.maxWidth = "320px";     // 모바일 기준 최대 제한
  mapImage.style.height = "auto";        // 비율 유지
  mapImage.style.display = "block";      // 중앙 정렬 가능하게
  mapImage.style.margin = "10px auto";   // 위쪽 여백 + 중앙 정렬

  planetInfoBox.appendChild(mapImage);
  // 문보트 이미지 추가
const boatImage = document.createElement("img");
boatImage.src = "./assets/문보트.png"; // ← 실제 보트 이미지 URL로 교체
boatImage.id = "mapBoat";
boatImage.classList.add("floating");
boatImage.style.position = "absolute";
boatImage.style.top = "40%";
boatImage.style.left = "50%";
boatImage.style.width = "48px";
boatImage.style.transform = "translate(-50%, -50%)";
boatImage.style.zIndex = "1000";

// ✅ 지도 이미지 감싸는 div 생성해서 위치 기준으로 사용
const mapWrapper = document.createElement("div");
mapWrapper.style.position = "relative";
mapWrapper.style.display = "inline-block";
mapWrapper.appendChild(mapImage);
mapWrapper.appendChild(boatImage);

  const position = boatPositions[currentZone.name];
if (position) {
  boatImage.style.top = position.top;
  boatImage.style.left = position.left;
}
  
  
planetInfoBox.appendChild(mapWrapper);

}

    }

    planetInfoBox.classList.remove("hidden");

  } else {
    planetInfoBox.classList.add("hidden");

    // ✅ 지도 이미지가 있으면 제거
    if (existingMap) {
      existingMap.remove();
    }
  }
});

planetInfoBox.addEventListener("click", () => {
  planetInfoBox.classList.add("hidden");

  // 지도 이미지 제거 (중복 방지)
  const mapImage = document.getElementById("mapImage");
  if (mapImage) mapImage.remove();
  const mapBoat = document.getElementById("mapBoat");
  if (mapBoat) mapBoat.remove();
});

function showFinalCollage() {
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 4800;
  const ctx = canvas.getContext("2d");
  const photoOrder = [
    { key: "photo1", x: 0, y: 0 },
    { key: "photo2", x: 0, y: 1200 },
    { key: "photo3", x: 0, y: 2400 },
    { key: "photo4", x: 0, y: 3600 },
    { key: "photo5", x: 800, y: 0 },
    { key: "photo6", x: 800, y: 1200 },
    { key: "photo7", x: 800, y: 2400 },
    { key: "photo8", x: 800, y: 3600 }
  ];

  let loaded = 0;
  const temp = [];

  const targets = photoOrder.filter(({ key }) => localStorage.getItem(key));

  if (targets.length === 0) {
    alert("📂 저장된 사진이 없습니다.");
    return;
  }

  console.log(`🎯 합성 대상 사진 수: ${targets.length}`);

  targets.forEach(({ key, x, y }) => {
    const data = localStorage.getItem(key);
    const img = new Image();
    img.onload = () => {
      console.log(`✅ ${key} 로드됨`);
      temp.push({ img, x, y });
      loaded++;
      if (loaded === targets.length) {
        console.log("🎬 draw() 실행됨");
        draw();
      }
    };
    img.onerror = () => {
      console.error(`❌ ${key} 이미지 로드 실패`);
    };
    img.src = data;
  });

  function draw() {
    temp.forEach(({ img, x, y }) => {
      ctx.drawImage(img, x, y, 800, 1200);
    });

    const final = canvas.toDataURL("image/jpeg", 0.9);
    const link = document.createElement("a");
    link.href = final;
    link.download = "문보트_탐험_인생네컷.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert("✅ 탐험이 완료되었습니다!\n사진이 자동으로 다운로드되었습니다.");
  }
}


previewButton.addEventListener("click", () => { // 🔍 사진 미리보기 토글
  if (photoPreview.classList.contains("hidden")) {
    renderPreviewCollage();
  } else {
    photoPreview.classList.add("hidden");
  }
});

document.getElementById("photoPreview").querySelector("button").addEventListener("click", () => {
  photoPreview.classList.add("hidden");
});

document.getElementById("meteorMissionButton").addEventListener("click", () => {
  startARGame();
});

document.addEventListener("DOMContentLoaded", () => {
  watchGPS(); // ✅ 앱 실행되면 GPS 추적 자동 시작
});


function renderPreviewCollage() { // 🖼 사진 미리보기용 콜라주
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 4800;
  const ctx = canvas.getContext("2d");
  const photoOrder = [
    { key: "photo1", x: 0, y: 0 },
    { key: "photo2", x: 0, y: 1200 },
    { key: "photo3", x: 0, y: 2400 },
    { key: "photo4", x: 0, y: 3600 },
    { key: "photo5", x: 800, y: 0 },
    { key: "photo6", x: 800, y: 1200 },
    { key: "photo7", x: 800, y: 2400 },
    { key: "photo8", x: 800, y: 3600 }
  ];
  let loaded = 0;
  const temp = [];
  photoOrder.forEach(({ key, x, y }) => {
    const data = localStorage.getItem(key);
    if (!data) return;
    const img = new Image();
    img.onload = () => {
      temp.push({ img, x, y });
      loaded++;
      if (loaded === temp.length) draw();
    };
    img.src = data;
  });
  function draw() {
    temp.forEach(({ img, x, y }) => {
      ctx.drawImage(img, x, y, 800, 1200);
    });
    const final = canvas.toDataURL("image/jpeg", 0.9);
    photoGallery.innerHTML = "";
    const img = new Image();
    img.src = final;
    img.style.width = "100%";
    photoGallery.appendChild(img);
    photoPreview.classList.remove("hidden");
  }
}
