# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
#====================================================================================
#!/bin/bash
#set -x
LOGFILENAME=sap-di-install.log
LOGFILE="${HOME}/install-sapdi/${LOGFILENAME}"
INSTALL_DIR="${HOME}/install-sapdi"

function load_config () {

    if test -f /tmp/deploy-sapdi.config ; then
        . /tmp/deploy-sapdi.config
    else
        log "ERROR: Config not found, aborting!"
        aws s3 cp ${LOGFILE} s3://${S3_BUCKET_NAME}/${LOGFILENAME}
        exit 1
    fi
}

function initlog () {
    if [ ! -d ${HOME}/install-sapdi ]; then mkdir ${HOME}/install-sapdi;fi 
    if [ -e $LOGFILE ]; then cp -Rp $LOGFILE $LOGFILE."`date +%Y%m%d%H%M%S`" ; fi
    echo Initializing log > ${LOGFILE}
}

function log () {
    echo `date` $* >> ${LOGFILE}
}

function install_update_kube_config () {
    log "INFO: Installing kubectl"
    curl -o kubectl https://amazon-eks.s3.us-west-2.amazonaws.com/1.16.15/2020-11-02/bin/linux/amd64/kubectl
    chmod +x ./kubectl
    mkdir -p $HOME/bin && cp ./kubectl $HOME/bin/kubectl && export PATH=$PATH:$HOME/bin
    kubectl version --short --client
    if [ $? -ne 0 ]
		then
		log "ERROR: Kubectl not present, aborting!"
        aws s3 cp ${LOGFILE} s3://${S3_BUCKET_NAME}/${LOGFILENAME}
        exit 1
    fi
    log "INFO: kubectl installed"
    aws eks --region us-east-2 update-kubeconfig --name sap-di3-v75 --role-arn arn:aws:iam::${AWSACCOUNTID}:role/cdk-eks-clusterNodeAdminRole-sapdi3
    #Apply cluster kube roles to service account
    kubectl apply -f ${INSTALL_DIR}/cluster-role-sa.yaml
    log "INFO: kubeconfig updated and cluster role for service account configured"

}

function copy_files_from_s3 () {
    log "INFO: Copying slcb executable"
    aws s3 cp s3://${S3_BUCKET_NAME}/slcb ${INSTALL_DIR}
    if [ $? -ne 0 ]
		then
		log "ERROR: Copy failed, aborting!"
        aws s3 cp ${LOGFILE} s3://${S3_BUCKET_NAME}/${LOGFILENAME}
        exit 1
    fi
    log "INFO: Copying MP Stack XML file"
    aws s3 cp s3://${S3_BUCKET_NAME}/${STACKFILE} ${INSTALL_DIR}/
    if [ $? -ne 0 ]
		then
		log "ERROR: Copy failed, aborting!"
        aws s3 cp ${LOGFILE} s3://${S3_BUCKET_NAME}/${LOGFILENAME}
        exit 1
    fi
    log "INFO: Copying slcb parameter file"
    aws s3 cp s3://${S3_BUCKET_NAME}/slcb-param.yaml ${INSTALL_DIR}/
    if [ $? -ne 0 ]
		then
		log "ERROR: Copy failed, aborting!"
        aws s3 cp ${LOGFILE} s3://${S3_BUCKET_NAME}/${LOGFILENAME}
        exit 1
    fi
    log "INFO: Copying slcb init parameter file"
    aws s3 cp s3://${S3_BUCKET_NAME}/slcb-init.yaml ${INSTALL_DIR}/
    if [ $? -ne 0 ]
		then
		log "ERROR: Copy failed, aborting!"
        aws s3 cp ${LOGFILE} s3://${S3_BUCKET_NAME}/${LOGFILENAME}
        exit 1
    fi
    log "INFO: Copying cluster SA role file"
    aws s3 cp s3://${S3_BUCKET_NAME}/cluster-role-sa.yaml ${INSTALL_DIR}/
    if [ $? -ne 0 ]
		then
		log "ERROR: Copy failed, aborting!"
        aws s3 cp ${LOGFILE} s3://${S3_BUCKET_NAME}/${LOGFILENAME}
        exit 1
    fi
    log "INFO: Copying L4 ELB config file"
    aws s3 cp s3://${S3_BUCKET_NAME}/service-l4.yaml ${INSTALL_DIR}/
    if [ $? -ne 0 ]
		then
		log "ERROR: Copy failed, aborting!"
        aws s3 cp ${LOGFILE} s3://${S3_BUCKET_NAME}/${LOGFILENAME}
        exit 1
    fi
    log "INFO: Copying Kubernetes NGINX ingress config file"
    aws s3 cp s3://${S3_BUCKET_NAME}/nginx-ingress.yaml ${INSTALL_DIR}/
    if [ $? -ne 0 ]
		then
		log "ERROR: Copy failed, aborting!"
        aws s3 cp ${LOGFILE} s3://${S3_BUCKET_NAME}/${LOGFILENAME}
        exit 1
    fi
}

function initialize_images () {
    log "INFO: SAP DI Initialzation"
    chmod +x ${INSTALL_DIR}/slcb
    cd ${INSTALL_DIR}
    ${INSTALL_DIR}/slcb init -u none --inifile ${INSTALL_DIR}/slcb-init.yaml 
    if [ $? -ne 0 ]
		then
		log "ERROR: SLCB init images failed!"
        aws s3 cp ${LOGFILE} s3://${S3_BUCKET_NAME}/${LOGFILENAME}
        exit 1
    fi
    log "INFO: SAP DI Initialzation completed"
}

function install_sapdi () {

    # Grep the ID for the sapdi installation
    STACKID=`echo ${STACKFILE}|awk -F"_" '{print $3}'`

    # Run main installation command
    log "INFO: Starting SAP DI Installation"
    cd ${INSTALL_DIR}
    ${INSTALL_DIR}/slcb execute -u none --useStackXML ${INSTALL_DIR}/${STACKFILE} --inifile ${INSTALL_DIR}/slcb-param.yaml --service "${STACKID}:${STACKFILE}|stackXML|platformFull"
    if [ $? -ne 0 ]
		then
		log "ERROR: Installation of DI failed!"
        aws s3 cp ${LOGFILE} s3://${S3_BUCKET_NAME}/${LOGFILENAME}
        exit 1
    fi
    log "INFO: SAP DI Installation completed"
    aws s3 cp ${LOGFILE} s3://${S3_BUCKET_NAME}/${LOGFILENAME}
}

function deploy_elb_ingress () {
    export NAMESPACE=sapdi3
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/nginx-0.24.1/deploy/mandatory.yaml
    kubectl apply -f ${INSTALL_DIR}/service-l4.yaml
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/nginx-0.24.1/deploy/provider/aws/patch-configmap-l4.yaml
    # Change the ingress YAML to input hostname
    sed -i "s/DIHOST/${SAPDIHOSTNAME}/" ${INSTALL_DIR}/nginx-ingress.yaml
    kubectl -n sapdi3 create -f ${INSTALL_DIR}/nginx-ingress.yaml
}

function copy_logs_to_s3 () {
    cd ${INSTALL_DIR}
    yum install -y tar
    yum install -y gzip
    /usr/bin/tar -czvf /tmp/logs.tar.gz ${INSTALL_DIR}
    aws s3 cp /tmp/logs.tar.gz s3://${S3_BUCKET_NAME}/
}

### Main program ###
### Call functions in required order
initlog
log "INFO: Starting AWS SAP DI unattended installation"

# Load config file
load_config

#log_setup
log "INFO: Check log file $logfile for more information"

# Copying all required files from S3
copy_files_from_s3

# Update kube config
install_update_kube_config

# Initialize the images for SAP DI
initialize_images 

# Installation of the SAP DI
install_sapdi

# Deploy Kubernetes classic LB in AWS with ingress to vsystem on port 8797
deploy_elb_ingress

# Copy log files to S3
# Uncomment if needed for further debugging 
#copy_logs_to_s3

log "INFO: Installation process completed"
### END ###
