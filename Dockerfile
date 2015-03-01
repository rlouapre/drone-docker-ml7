# MarkLogic 7
#
# VERSION               0.1
# DOCKER-VERSION        1.5

FROM rlouapre/centos6-ml:7.0-4.3
MAINTAINER Richard Louapre <richard.louapre@marklogic.com>
WORKDIR /tmp
ADD bootstrap.sh /tmp/bootstrap.sh 
# RUN /bin/bash -c '/tmp/bootstrap.sh'
RUN ["/bin/bash", "-c", "/tmp/bootstrap.sh"]

WORKDIR /
# Expose MarkLogic admin
EXPOSE 2022 8000 8001 8002 9305 9306
