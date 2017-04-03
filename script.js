function isObjectInList(obj, list) {
	var isit = false;
	list.map(function(list_obj){
		if (list_obj["id"] === obj["id"]) isit = true;
	});
	return isit;
}

function parseDate(date_string) {
	var cest_parser = d3.timeParse("%Y-%m-%d %H:%M %p CEST");
	var est_parser = d3.timeParse("%Y-%m-%d %H:%M %p EST");
	if (cest_parser(date_string) !== null) return cest_parser(date_string);
	else return est_parser(date_string);
}

function populateCalendarData(name, data_string) {
	var parser = d3.dsvFormat(",");
	var calendar = parser.parse(data_string);

	calendar.map(function(row) {
		if (row["ATTENDEE"] !== undefined) {
			var name_list = row["ATTENDEE"].split(";").map(function(name){
				return name.trim();
			});
			if (name_list.indexOf(name) === -1) {
				name_list.push(name);
			}
			row["ATTENDEE"] = name_list;
			row["DTSTART"] = parseDate(row["DTSTART"]);
			row["DTEND"] = parseDate(row["DTEND"]);

			if (!row["SUMMARY"].includes("Footy")
				&& !row["SUMMARY"].includes("Football")
				&& row["ATTENDEE"].indexOf("EnExGroup (UK only)") === -1
				) {
					calendar_data.push(row);
				}
		}
	});
}

var handleFileUpload = function(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	//FileList object
	var files = evt.target.files;

	for (var i=0; i<files.length; i++) {
		//Go through every dropped file, read its contents with a FileReader()
		var file = files[i];

		//Each file has a reader
		var reader = new FileReader();
		reader.readAsText(file);
		reader.current_file_name = file.name;
		reader.current_file_index = i;
		reader.last_index = files.length - 1;

		//Gets executed when the reader finishes loading in the file's content
		reader.onloadend = function(e) {
			//Convert file name to name
			var name_list = this.current_file_name.split(".")[0].split("#");
			var name = name_list[1]+", "+name_list[0];
			console.log(name+"  :  "+this.result.slice(100, 120));
			populateCalendarData(name, this.result);

			if (this.current_file_index === this.last_index) {
				console.log("all loaded");
				console.log("calendar_data length: "+calendar_data.length);
				fillXML();
			}
		}
	}
}

function makeTextFile(text) {
	//Converts a string to a downloadable text file
    var data = new Blob([text], {type: 'text/xml'});

    // If we are replacing a previously generated file we need to
    // manually revoke the object URL to avoid memory leaks.
    if (textFile !== null) {
        window.URL.revokeObjectURL(textFile);
    }

    var textFile = window.URL.createObjectURL(data);

    // returns a URL you can use as a href
    return textFile;
};

function addOutputButtonListener(output_button, file_str) {
    output_button.node().addEventListener("click", function() {
        var link = document.createElement('a');
        link.setAttribute('download', 'graph.gexf');
        link.href = makeTextFile(file_str);
        document.body.appendChild(link);

        // wait for the link to be added to the document
        window.requestAnimationFrame(function () {
            var event = new MouseEvent('click');
            link.dispatchEvent(event);
            document.body.removeChild(link);
        });
    }, false);
}

function addNode(id, label) {
	id_att = xml_doc.createAttribute("id");
	label_att = xml_doc.createAttribute("label");

	id_att.nodeValue = id;
	label_att.nodeValue = label;

	node_element = xml_doc.createElement("node");
	node_element.setAttributeNode(id_att);
	node_element.setAttributeNode(label_att);

	xml_doc.getElementsByTagName("nodes")[0].appendChild(node_element);
}

function addEdge(id, source, target) {
	id_att = xml_doc.createAttribute("id");
	source_att = xml_doc.createAttribute("source");
	target_att = xml_doc.createAttribute("target");

	id_att.nodeValue = id;
	source_att.nodeValue = source;
	target_att.nodeValue = target;

	node_element = xml_doc.createElement("edge");
	node_element.setAttributeNode(id_att);
	node_element.setAttributeNode(source_att);
	node_element.setAttributeNode(target_att);

	xml_doc.getElementsByTagName("edges")[0].appendChild(node_element);
}

function addElement(parent, name) {
	node_element = xml_doc.createElement(name);
	xml_doc.getElementsByTagName(parent)[0].appendChild(node_element);
}

function fillXML() {
	calendar_data.map(function(meeting) {
		var meeting_node = {id: meeting["SUMMARY"], label: "meeting", shape: "box"};
		if (!isObjectInList(meeting_node, node_list)) node_list.push(meeting_node);

		if (meeting["ATTENDEE"] !== undefined) {
			meeting["ATTENDEE"].map(function(name) {
				var name_node = {id: name, label: "person", color: "orange"};
				if (!isObjectInList(name_node, node_list)) node_list.push(name_node);

				edge_list.push({from: meeting["SUMMARY"], to: name, length: 1});

				// meeting["ATTENDEE"].map(function(other_name) {
				// 	edge_list.push({from: other_name, to: name, hidden: false});
				// });
			});
		}
	});

	node_list.map(function(node_obj) {
		addNode(node_obj.id, node_obj.label);
	});
	console.log("nodes added", node_list.length);
	edge_list.map(function(edge_obj, i){
		addEdge(i, edge_obj.from, edge_obj.to);
	});
	console.log("edges added", edge_list.length);
	console.log(xml_doc);

	output_button = d3.select("body").append("button")
		.attr("id", "create")
		.text("Download labels");
	addOutputButtonListener(output_button, new XMLSerializer().serializeToString(xml_doc));
}

//=========================================================================
var calendar_data = [];
var node_list = [];
var edge_list = [];

var xml_doc = document.implementation.createDocument(null, "gexf");
addElement("gexf", "graph");
addElement("graph", "nodes");
addElement("graph", "edges");

// addNode("msk", "Moscow");
// addNode("lndn", "London");
// addNode("ny", "New York");
//
// addEdge(0, "msk", "lndn");
// addEdge(1, "ny", "lndn");
// console.log(xml_doc);

document.getElementById('files').addEventListener('change', handleFileUpload, false);
