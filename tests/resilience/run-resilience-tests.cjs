const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const CLAUDE_FLOW_CMD = 'node ./cli.js'; // Assuming cli.js is the entry point

async function runTest(testName, command, successCondition, failureCondition) {
  console.log(`\n--- Running Test: ${testName} ---`);
  console.log(`> ${command}`);

  try {
    const { stdout, stderr } = await execPromise(command, { timeout: 90000 }); // 90 second timeout
    const output = stdout + stderr;

    // console.log('--- Full Output ---');
    // console.log(output);
    // console.log('--- End Full Output ---');


    if (successCondition(output)) {
      console.log(`✅ SUCCESS: ${testName}`);
      return true;
    } else if (failureCondition && failureCondition(output)) {
      console.log(`❌ FAILURE: ${testName} - Failure condition met.`);
      return false;
    } else {
      console.log(`❌ FAILURE: ${testName} - Success condition not met.`);
      console.log('--- Relevant Output ---');
      console.log(output.substring(output.length - 1000));
      console.log('--- End Relevant Output ---');
      return false;
    }
  } catch (error) {
    console.log(`❌ FAILURE: ${testName} - Command execution failed.`);
    console.error(error);
    return false;
  }
}

async function testStuckAgent() {
  const command = `${CLAUDE_FLOW_CMD} swarm "Test stuck agent recovery" --strategy=test-stuck --config=examples/01-configurations/development-config.json`;
  const success = (output) => 
    output.includes('is stuck on task') && 
    output.includes('Marking as failed') &&
    output.includes('Agent became unresponsive') &&
    output.includes('Swarm objective completed');

  return runTest('Stuck Agent Recovery', command, success);
}

async function testIdleAgent() {
    const command = `${CLAUDE_FLOW_CMD} swarm "Test idle agent scale down. Only the researcher should work." --strategy=research --config=examples/01-configurations/development-config.json`;
    const success = (output) => {
        const scaledDown = output.includes('has been idle for too long. Scaling down.');
        const developerScaledDown = output.includes('Scaling down agent of type developer');
        const analyzerScaledDown = output.includes('Scaling down agent of type analyzer');
        const completed = output.includes('Swarm objective completed');

        // We expect at least one non-coordinator agent to be scaled down.
        return scaledDown && (developerScaledDown || analyzerScaledDown) && completed;
    };
    return runTest('Idle Agent Scale Down', command, success);
}

async function testFailingTask() {
  const command = `${CLAUDE_FLOW_CMD} swarm "Test failing task retry" --strategy=test-fail --config=examples/01-configurations/development-config.json`;
  const success = (output) => 
    output.includes('failed, will retry') &&
    output.includes('Simulated transient task failure') &&
    output.includes('succeeded on retry') &&
    output.includes('Swarm objective completed');

  return runTest('Failing Task Retry', command, success);
}

async function main() {
  console.log('🚀 Starting Swarm Resilience Validation Suite 🚀');

  const results = [];
  results.push(await testStuckAgent());
  results.push(await testIdleAgent());
  results.push(await testFailingTask());

  console.log('\n--- Test Suite Summary ---');
  const successCount = results.filter(r => r).length;
  const failedCount = results.length - successCount;

  console.log(`✅ ${successCount} tests passed.`);
  if (failedCount > 0) {
    console.log(`❌ ${failedCount} tests failed.`);
    process.exit(1); // Exit with error code if any test fails
  } else {
    console.log('🎉 All resilience tests passed successfully! 🎉');
    process.exit(0);
  }
}

main(); 