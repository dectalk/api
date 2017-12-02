const zoomcss = document.getElementById("zoomcss");

const zoom = (that) => {
	zoomcss.innerHTML = `.time { width: ${that.value}px; }`;
};
