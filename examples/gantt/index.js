import {gantt_project} from "./gantt_project.js"


window.addEventListener('load', () => {
    const cyto = cytoscape({
        container: document.getElementById('graph'),
        style: [
            {
                selector: 'node',
                style: {
                    'label': 'data(name)'
                }
            },
            // {
            //     selector: '.parent',
            //     style: {
            //         'background-color': 'red',
            //         'label': 'data(id)',
            //         'line-color': 'red',
            //     }
            // },
            {
                selector: 'edge',
                style: {
                    'curve-style': 'bezier',
                    'width': 3,
                    'line-color': '#ccc',
                    'target-arrow-color': '#ccc',
                    'target-arrow-shape': 'triangle'
                }
            }
        ]
    });

    cyto.json(gantt_project)

    cyto.layout({ name: 'klay' }).run();
});
