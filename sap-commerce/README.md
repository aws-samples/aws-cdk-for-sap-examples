## Welcome to CDK TypeScript project for SAP Commerce!

### Overview
This repository contains examples of how to deploy a SAP Commerce system on Amazon Elastic Kubernetes Service(EKS) using AWS Cloud Development Kit (CDK). This is not design for production usage. The code creates a new VPC for the Aurora RDS and EKS.

To deploy SAP Commerce:

Prerequisites

1. Download the SAP Commerce software and place in an Amazon S3 bucket
2. Containerize SAP Commerce. You can refer to the SAP commerce repository in the [ AWS sample GitHub](https://github.com/aws-samples/aws-cloudformation-sap-commerce ) to automate this. Just select the option to create Docker image and this will automatically upload an image to Amazon Elastic Container Registry (ECR).

Go to the sap-commerce directory and run the command block below.

```
$ npm -g install typescript
$ npm install @aws-cdk/core @aws-cdk/aws-ec2 @aws-cdk/aws-iam @aws-cdk/aws-eks 
$ cd cdk-sap-commerce-basic
$ cdk synth
$ cdk deploy  // Deploys the CloudFormation template

# Afterwards
$ cdk destroy
```
# License

This library is licensed under the MIT-0 License. See the LICENSE file.

# Appendix 
SAP on AWS blog post - [Kubernetes and the path to cloud native application – An example with SAP Commerce](https://aws.amazon.com/blogs/awsforsap/kubernetes-and-the-path-to-cloud-native-application-an-example-with-sap-commerce/)
