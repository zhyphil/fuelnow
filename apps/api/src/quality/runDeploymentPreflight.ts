import { assessDeploymentConfiguration } from "./deploymentPreflight.js";
const report = assessDeploymentConfiguration(process.env);
console.log(JSON.stringify(report));
process.exitCode = report.passed ? 0 : 2;
