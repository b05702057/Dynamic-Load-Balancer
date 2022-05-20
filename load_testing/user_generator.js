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

function generatePhaseElements(phases, phase_idx, sample_lists, element_list) {
    cur_phase = phases[phase_idx];
    request_num = cur_phase.duration * cur_phase.arrivalRate;
    sample_list = sample_lists[phase_idx];
    for (let i = 0; i < request_num; i++) {
        idx = getRandomInt(sample_list.length);
        element_list.push(sample_list[idx]);
    }
    return phase_idx + 1;
}

// make sure "set" is called before "get" for each key
function addRequestTypes(element_list) {
    stored_keys = new Set();
    output_list = []
    element_list.forEach(element => {
        // 0 stands for "set", and 1 stands for get
        random = getRandomInt(2);
        if (random === 0) {
            output_list.push(element + ",set");
            stored_keys.add(element);
        } else {
            if (stored_keys.has(element)) {
                output_list.push(element + ",get");
            } else {
                output_list.push(element + ",set");
            }
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
        for (let j = 0; j < key_num; j++) {
            if (cdf[j] >= random) {
                sample_list.push(j + 1);
                break;
            }
        }
    }
    return sample_list;
}


// define load patterns
element_list = []; // output
sample_list1 = generatePhasePattern(3, NORMAL); // normal distribution
sample_list2 = generatePhasePattern(3, UNIFORM); // uniform distribution
sample_list3 = generatePhasePattern(3, [1, 2, 6]); // user3 is hot
sample_lists = [sample_list1, sample_list2, sample_list3]; // modify this list to customize the load for each phase
// The sample lists are currently used as user id's, but we can use them as index and create new sample lists as string keys.

// parse the yaml file to get the parameters
const doc = yaml.load(fs.readFileSync('customized_test.yml', 'utf8'));
phases = doc.config.phases;
phase_idx = 0;

// generate elements for each phase
phase_idx = generatePhaseElements(phases, phase_idx, sample_lists, element_list); // phase 0
phase_idx = generatePhaseElements(phases, phase_idx, sample_lists, element_list); // phase 1
phase_idx = generatePhaseElements(phases, phase_idx, sample_lists, element_list); // phase 2

// write the elements
element_list = addRequestTypes(element_list);
elements = element_list.join("\n");
fs.writeFileSync('users.csv', elements);
