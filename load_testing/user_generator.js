const fs = require('fs');
const yaml = require('js-yaml');
var PD = require("probability-distributions");

const BINOMIAL = "Bionmial";
      BETA = "Beta";
      CAUCHY = "Cauchy";
      CHISQUARED = "Chi-Squared";
      EXPONENTIAL = "Exponential";
      FDISTRIBUTION = "F-Distribution";
      GAMMA = "Gamma";
      LAPLACE = "Laplace";
      LOGNORMAL = "Log-normal";
      NEGATIVEBINOMIAL = "Negative Binomial";
      NORMAL = "Normal";
      POISSON = "Poisson";
      UNIFORM = "Uniform";

// generate a random number from 0 to (max - 1)
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

// generate a random key/value
function getRandomString(max_length) {
    var result = '';
    var result_length = getRandomInt(max_length) + 1;
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    var charactersLength = characters.length;
    for ( var i = 0; i < result_length; i++ ) {
      result += characters.charAt(
          Math.floor(Math.random() * charactersLength)
        );
    }
   return result;
}

function generatePhaseKeys(phases, phase_idx, sample_lists, element_list, keys) {
    cur_phase = phases[phase_idx];
    request_num = Math.ceil(cur_phase.duration * cur_phase.arrivalRate / thread_num);
    request_num += Math.ceil(request_num / 10)
    sample_list = sample_lists[phase_idx];
    for (let i = 0; i < request_num; i++) {
        idx = getRandomInt(sample_list.length);
        element_list.push(keys[sample_list[idx]]);
    }
    return phase_idx + 1;
}

function generateKeysForAllPhases(phases, sample_lists, element_list, keys, thread_num) {
    var phase_idx = 0;
    for (let i = 0; i < phases.length; i++) {
        phase_idx = generatePhaseKeys(phases, phase_idx, sample_lists, element_list, keys, thread_num);
    }
}

function addRequestValues(element_list, max_value_length) {
    var output_list = []
    element_list.forEach(element => {
        var random_value = getRandomString(max_value_length);
        output_list.push(element + "," + random_value);
    })
    return output_list;
}

// make sure "set" is called before "get" for each key
function addRequestTypes(element_list, get_percentage) {
    var stored_keys = new Set();
    var output_list = []
    element_list.forEach(element => {
        var key = element.split(",")[0];

        // 0 stands for "set", and 1 stands for get
        random = getRandomInt(100);
        if (random < get_percentage && stored_keys.has(key)) {
            output_list.push(element + ",get");
        } else {
            output_list.push(element + ",set");
            stored_keys.add(key);
        }
    })
    return output_list;
}

// make the sum 1
function normalize(distribution) {
    var sum = distribution.reduce((a, b) => a + b, 0);
    var normalized_distribution = [];
    distribution.forEach(element => normalized_distribution.push(element / sum));
    return normalized_distribution;
}

// convert the probability density function to a cumulative density function
function pdf_to_cdf(distribution) {
    var cdf = [0];
    for (let i = 0; i < distribution.length; i++) {
        cdf.push(cdf[i] + distribution[i]);
    }
    // make the sum 1 instead of 0.9999999999.
    cdf[cdf.length - 1] = 1; 
    return cdf.slice(1);
}

// generate a distribution list with the specified name
function generate_distribution(key_num, distribution) {
    switch (distribution) {
        case BINOMIAL:
            return PD.rbinom(key_num, trial_num=20, success_rate=0.8);
        case BETA:
            return PD.rbeta(key_num, alpha=0.5, beta_p=3);
        case CAUCHY:
            return PD.rcauchy(key_num, location=0, scale=1);
        case CHISQUARED:
            return PD.rchisq(key_num, degree_of_freedom=5);
        case EXPONENTIAL:
            return PD.rexp(key_num, rate=0.7);
        case FDISTRIBUTION:
            return PD.rf(key_num, df1=2, df2=5);
        case GAMMA:
            return PD.rgamma(key_num, shape=0.5, rate=20);
        case LAPLACE:
            return PD.rlaplace(key_num, mean=100, scale=1);
        case LOGNORMAL:
            return PD.rlnorm(key_num, mean_log=0, sd_log=1);
        case NEGATIVEBINOMIAL:
            return PD.rnbinom(key_num, size=6, success_rate=0.4);
        case NORMAL:
            return PD.rnorm(key_num, mean=100, sd=30);
        case POISSON:
            return PD.rpois(key_num, mean=100);
        case UNIFORM:
            return PD.runif(key_num, min=0, max=1);
        default:
            return distribution // simply use the input as the distribution
    }
}

// find the first element in the array that >= target
function getFisrtBiggerElement(start, end, array, target) {
    if (start === end) {
        return start;
    }

    const mid = Math.floor((start + end) / 2);
    if (array[mid] < target) {
        return getFisrtBiggerElement(mid + 1, end, array, target);
    }
    return getFisrtBiggerElement(start, mid, array, target);
}

// check different distributions here.
// https://statisticsblog.com/probability-distributions/
function generatePhasePattern(key_num, distribution) {
    distribution = generate_distribution(key_num, distribution);
    var normalized_distribution = normalize(distribution);
    var cdf = pdf_to_cdf(normalized_distribution);
    console.log(`cdf: ${cdf}`)
    
    // create the sample list
    sample_list = []
    for (let i = 0; i < 100; i++) {
        var random = Math.random();
        sample_list.push(getFisrtBiggerElement(0, cdf.length - 1, cdf, random)); // binary search
    }
    return sample_list;
}

function generateSampleLists(total_key_num, ...distributions_and_key_nums) {
    var sample_lists = []
    distributions_and_key_nums.forEach(distribution_and_key_num => {
        var distribution = distribution_and_key_num[0];
        var key_num = distribution_and_key_num[1];

        if (key_num > total_key_num) {
            throw Error("Please generate enough keys first!")
        } 

        if (typeof distribution !== 'string' && key_num !== distribution.length) {
            throw Error("wrong key length");
        }
        sample_lists.push(generatePhasePattern(key_num, distribution));
    })
    return sample_lists;
}

// generate keys
var keys = new Set();
const key_num = 1000;
const max_key_length = 10
while (keys.size < key_num) {
    keys.add(getRandomString(max_key_length));
}
keys = Array.from(keys);

// define load patterns
// sample_lists = generateSampleLists(key_num, NORMAL, UNIFORM, [1, 2, 6, 3, 3, 3, 3, 3, 1, 1]);
// sample_lists = generateSampleLists(key_num, [1, 2, 6, 3, 3, 3, 3, 3, 1, 1], [1, 2, 6, 3, 3, 3, 3, 3, 1, 1], [1, 2, 6, 3, 3, 3, 3, 3, 1, 1]);
// // 2 peak loads
// sample_lists = generateSampleLists(10, [1000, 1000, 1, 1, 1, 1, 1, 1, 1, 1], [1, 1000, 1000, 1, 1, 1, 1, 1, 1, 1], [1000, 1, 1000, 1, 1, 1, 1, 1, 1, 1]);
sample_lists = generateSampleLists(total_key_num=key_num, [NORMAL, 1000], [[1, 2, 2, 3, 3, 3, 10, 10, 1, 1], 10], [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 10]);

// parse the yaml file to get the parameters
const doc = yaml.load(fs.readFileSync('customized_test.yml', 'utf8'));
var phases = doc.config.phases;
var thread_num = doc.config.thread;

// generate elements for each phase
var element_list = []; // output
generateKeysForAllPhases(phases, sample_lists, element_list, keys);

// write the elements
const max_value_length = 100;
element_list = addRequestValues(element_list, max_value_length);

var get_percentage = 60 // 99% would be get requests
element_list = addRequestTypes(element_list, get_percentage); 
var elements = element_list.join("\n");
fs.writeFileSync('users.csv', elements);
