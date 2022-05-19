const fs = require('fs');
const yaml = require('js-yaml');

// generate a random number from 0 to (max - 1)
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function generatePhaseElements(phases, phase_idx, sample_lists, element_list) {
    cur_phase = phases[phase_idx]
    request_num = cur_phase.duration * cur_phase.arrivalRate
    sample_list = sample_lists[phase_idx]
    for (let i = 0; i < request_num; i++) {
        idx = getRandomInt(sample_list.length)
        element_list.push(sample_list[idx]);
    }
    return phase_idx + 1
}

// define load patterns
element_list = [] // output
sample_list1 = ["1", "1", "1", "1", "1", "1", "1", "1", "1", "2"] // user1 is hot
sample_list2 = ["1", "2", "2", "2", "2", "2", "2", "2", "2", "2"] // user2 is hot
sample_lists = [sample_list1, sample_list2, sample_list1] // modify this list to customize the load for each phase

// parse the yaml file to get the parameters
const doc = yaml.load(fs.readFileSync('customized_test.yml', 'utf8'));
phases = doc.config.phases;
phase_idx = 0

// generate elements for each phase
phase_idx = generatePhaseElements(phases, phase_idx, sample_lists, element_list) // phase 0
phase_idx = generatePhaseElements(phases, phase_idx, sample_lists, element_list) // phase 1
phase_idx = generatePhaseElements(phases, phase_idx, sample_lists, element_list) // phase 2

// write the elements
elements = element_list.join("\n")
fs.writeFileSync('users.csv', elements);
