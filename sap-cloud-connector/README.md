# Welcome to the CDK TypeScript project for SAP cloud connector!

This an example to deploy SAP Connector on SUSE Linux 15 SP2. This example requires an existing VPC in your AWS account. 

## Build

Before deploying the SAP Cloud Connector, you must first edit `/lib/appConfig.json` with information on your AWS account.

```bash
git clone https://github.com/aws-samples/aws-cdk-for-sap-examples.git
cd aws-cdk-for-sap-examples/sap-cloud-connector
npm install
```
This will install the necessary CDK, then this example's dependencies, and then build your TypeScript files and your CloudFormation template.

## Deploy

Run `cdk deploy`. This will deploy / redeploy your Stack to your AWS Account.

After the deployment you will see the EC2 private IP address, which represents the IP address you can then use. Access to https:// < IP address > :8443 to login in Cloud Connector. By default, use a self signed certificate. Hence, your browser will ask you to trust the server. The default user name and passwrod are as below.

    Username: Administrator
    Password: manage

## Appendix 
Supported region include us-east-1, us-east-2, us-west-1, us-west-2,eu-west-1 and eu-central-1. 
SAP blog post - [Deploy SAP Cloud Connector on AWS using SAP Business Application Studio](https://blogs.sap.com/2020/11/13/deploy-sap-cloud-connector-on-aws-using-sap-business-application-studio/)
