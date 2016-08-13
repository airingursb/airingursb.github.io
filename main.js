$(document).ready(function() {
	$('#fancybox').fancybox({
		padding : 0,
		openEffect  : 'elastic',
		closeBtn: false
	});
});
window.onload = function() { document.body.className = ''; }
window.ontouchmove = function() { return false; }
window.onorientationchange = function() { document.body.scrollTop = 0; }