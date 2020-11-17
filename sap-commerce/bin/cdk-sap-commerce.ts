#!/usr/bin/env node

import * as cdk from '@aws-cdk/core';
import { CdkVpcStack } from '../lib/cdk-vpc-stack';
import { CdkEksStack } from '../lib/cdk-eks-stack';
import { CdkRdsStack } from '../lib/cdk-rds-stack';

const app = new cdk.App();
const vpcStack = new CdkVpcStack(app, 'cdk-vpc');
const rdsStack = new CdkRdsStack(app, 'cdk-rds', {vpc:vpcStack.vpc });
const eksStack = new CdkEksStack(app, 'cdk-eks', {
    vpc:vpcStack.vpc, 
    rdsCluster:rdsStack.rdsCluster,
});


