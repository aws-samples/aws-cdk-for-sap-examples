#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { CdkSapccStack } from '../lib/cdk-ec2-sapcc-stack';

const app = new cdk.App();
const AppConfig = require('../lib/appConfig.json') 
const sapcc = new CdkSapccStack(app, 'cdk-cloud-connector-stack', {
      env: AppConfig.env
  });

app.synth();