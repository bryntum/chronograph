import {gantt_project} from "./gantt_project.js"


window.addEventListener('load', () => {
    const cyto = cytoscape({
        container: document.getElementById('graph'),
    });

    cyto.json(gantt_project)

    cyto.layout({ name: 'klay' }).run();
});
