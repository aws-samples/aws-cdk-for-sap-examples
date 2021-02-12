/* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#
# Permission is hereby granted, free of charge, to any person obtaining a copy of this
# software and associated documentation files (the "Software"), to deal in the Software
# without restriction, including without limitation the rights to use, copy, modify,
# merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
# permit persons to whom the Software is furnished to do so.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
# INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
# PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
# HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
# OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
# SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
#
==================================================================================== */
import * as core from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
//import { Tags } from "@aws-cdk/core";

export class CdkVpcStack extends core.Stack {

  vpc:ec2.Vpc;

  constructor(scope: core.App, id: string, props?: core.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "VPC-SAPDI", {
      maxAzs: 2,
      cidr:"10.20.0.0/16",
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'sapdi-public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'sapdi-private',
          subnetType: ec2.SubnetType.PRIVATE,
        },
      ],
      natGateways: 2,

    });
 // only required for existing VPC, if creating new CDK will add this tag automatically, required by the SAP DI installer  
 // Tags.of(this).add('kubernetes.io/role/internal-elb', '1', 
//  { includeResourceTypes: ['AWS::EC2::Subnet']});

  }
}


             