//Load DataTables on load
$('#dectalk').DataTable({
	ajax: "/list?array",
	sAjaxDataProp: "",
	bAutoWidth: false,
	fixedColumns: true,
	aoColumns: [
		{
			mData: "id",
		},
		{
			mData: "name",
		},
		{
			mData: "author",
		},
		{
			mData: "artist",
		},
		{
			mData: null,
			mRender: (data, type, full) => { return `<audio controls preload="none"><source src="/dec/${full.id}.wav"></source></audio>`;}
		},
		{
			mData: "dectalk",
			mRender: (data, type, full) => { return `<button type="button" class="btn btn-primary" onclick="copyText(\`${data}\`)">Copy</button>`;}
		}
	]
});

//

//All hail stackoverflow!
//http://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
function copyText(text) {
	var textArea = document.createElement("textarea");

	// Place in top-left corner of screen regardless of scroll position.
	textArea.style.position = 'fixed';
	textArea.style.top = 0;
	textArea.style.left = 0;

	// Ensure it has a small width and height. Setting to 1px / 1em
	// doesn't work as this gives a negative w/h on some browsers.
	textArea.style.width = '2em';
	textArea.style.height = '2em';

	// We don't need padding, reducing the size if it does flash render.
	textArea.style.padding = 0;

	// Clean up any borders.
	textArea.style.border = 'none';
	textArea.style.outline = 'none';
	textArea.style.boxShadow = 'none';

	// Avoid flash of white box if rendered for any reason.
	textArea.style.background = 'transparent';


	textArea.value = text;

	document.body.appendChild(textArea);

	textArea.select();

	try {
		document.execCommand('copy');
	} catch (err) {
		alert("The copy was unsuccessful.")
	}

	document.body.removeChild(textArea);
}
