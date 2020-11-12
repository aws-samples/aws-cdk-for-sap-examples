#!/bin/bash 
# SAP Cloud Connector Bootstraping
# Author : patleung@amazon.com

################ Functions ################ 
function install_ssm_agent() {
	mkdir /tmp/ssm
    cd /tmp/ssm
	wget https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm > /dev/null 2>&1
    rpm --install amazon-ssm-agent.rpm > /dev/null 2>&1

    sudo systemctl enable amazon-ssm-agent
    sudo systemctl start amazon-ssm-agent

	_SSM_RUNNING=$(ps -ef | grep ssm | grep -v grep)

	if [ -n "$_SSM_RUNNING" ]
	then
		echo 0
	else
		echo 1
	fi
}

function set_hostname() {

    PHOSTNAME="sapcc1"
	MY_IP=$( ip a | grep inet | grep eth0 | awk -F"/" '{ print $1 }' | awk '{ print $2 }')
	echo "${MY_IP}"    "${PHOSTNAME}" >> /etc/hosts  
    hostname $PHOSTNAME
    echo $PHOSTNAME > /etc/hostname

}

function downloads_sap_software(){
    #Download SAP software 
    mkdir /tmp/sapcc
    cd /tmp/sapcc

    zypper -y install unzip > /dev/null 2>&1
    
    wget --no-check-certificate --no-cookies --header "Cookie: eula_3_1_agreed=tools.hana.ondemand.com/developer-license-3_1.txt; path=/;" -S https://tools.hana.ondemand.com/additional/sapcc-2.12.5-linux-x64.zip  
    
    wget --no-check-certificate --no-cookies --header "Cookie: eula_3_1_agreed=tools.hana.ondemand.com/developer-license-3_1.txt; path=/;" -S https://tools.hana.ondemand.com/additional/sapjvm-8.1.065-linux-x64.rpm

}

function setup_cert(){
    secpassword=$( /opt/sapjvm_8/bin/java -cp /opt/sap/scc/plugins/com.sap.scc.rt*.jar -Djava.library.path=/opt/sap/scc/auditor com.sap.scc.jni.SecStoreAccess -path /opt/sap/scc/scc_config -p | cut -c 17-32)

    /opt/sapjvm_8/bin/keytool -delete -alias tomcat -keystore /opt/sap/scc/config/ks.store -storepass $secpassword

    /opt/sapjvm_8/bin/keytool -keysize 4096 -genkey -v -keyalg RSA -validity 3650 -alias tomcat -keypass $secpassword -keystore /opt/sap/scc/config/ks.store -storepass $secpassword -dname "CN=sapcc1, OU=AWS, O=AWS"

    # The JKS keystore uses a proprietary format. It is recommended to migrate to PKCS12 which is an industry standard format
    # Debug 
    # /opt/sapjvm_8/bin/keytool -list -keystore /opt/sap/scc/config/ks.store
    /opt/sapjvm_8/bin/keytool -importkeystore -srckeystore /opt/sap/scc/config/ks.store -destkeystore /opt/sap/scc/config/ks.store -deststoretype pkcs12

    cp /opt/sap/scc/config_master/org.eclipse.gemini.web.tomcat/default-server.xml  /opt/sap/scc/config_master/org.eclipse.gemini.web.tomcat/default-server.xml.bak
    cp /root/install/default-server.xml /opt/sap/scc/config_master/org.eclipse.gemini.web.tomcat/

    systemctl restart scc_daemon

}

function install_scc(){
    unzip sapcc-2.12.5-linux-x64.zip 
    rpm -i sapjvm-8.1.065-linux-x64.rpm 
    rpm -i com.sap.scc-ui-2.12.5-4.x86_64.rpm
}

################ End of Functions ################ 

################ Start Script Logic ################
install_ssm_agent
set_hostname
downloads_sap_software
install_scc
setup_cert

################ End of Script Logic ################



