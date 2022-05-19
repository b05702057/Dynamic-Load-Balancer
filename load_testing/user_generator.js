const csv = require('csv-parser');
const fs = require('fs');

// generate a random number from 0 to (max - 1)
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

element_list = []
sample_list1 = ["1", "1", "1", "1", "1", "1", "1", "1", "1", "2"] // user1 is hot
sample_list2 = ["1", "2", "2", "2", "2", "2", "2", "2", "2", "2"] // user2 is hot

for (let i = 0; i < 100; i++) {
    idx = getRandomInt(10)
    element_list.push(sample_list1[idx]);
}
for (let i = 0; i < 100; i++) {
    idx = getRandomInt(10);
    element_list.push(sample_list2[idx]);
}
elements = element_list.join("\n")

fs.writeFileSync('users.csv', elements);
