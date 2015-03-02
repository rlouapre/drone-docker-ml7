# MarkLogic 7
#
# VERSION               0.1
# DOCKER-VERSION        1.5

FROM rlouapre/centos6-ml:7.0-4.3
MAINTAINER Richard Louapre <richard.louapre@marklogic.com>

RUN ["/bin/bash", "-c", "/etc/rc.d/init.d/MarkLogic start"]
# RUN ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
# WORKDIR /tmp
RUN ["/bin/bash", "-c", "curl localhost:8001 --retry 10 --retry-delay 2"]
ADD bootstrap.sh /usr/local/bin/bootstrap.sh 
# RUN /bin/bash -c '/tmp/bootstrap.sh'
RUN chmod 755 /usr/local/bin/bootstrap.sh
RUN ["/bin/bash", "-c", "/usr/local/bin/bootstrap.sh"]

WORKDIR /
# Expose MarkLogic admin
EXPOSE 2022 8000 8001 8002 9305 9306
