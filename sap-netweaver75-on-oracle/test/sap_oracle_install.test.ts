import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as SapOracleInstall from '../lib/sap_oracle_install-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new SapOracleInstall.SapOracleInstallStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
