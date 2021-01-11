#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SapOracleInstallStack } from '../lib/sap_oracle_install_stack';

const app = new cdk.App();
const AppConfig = require('../lib/appConfig.json') 

const pasStack = new SapOracleInstallStack(app, 'sap-oracle-stack-8', {
      env: AppConfig.env
  });

app.synth();