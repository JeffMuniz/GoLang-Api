to be able to use this, only Docker and compose are enough

* - Choice of docker image (prebuilt or otherwise) and reasoning for:
--build-arg			Set build-time variables
  
#ReadMe Docker Challenge 

1. Why would you use a local docker-compose environment?
Docker compose is required for building named services (not IP). To fit the archechture proposed by the chalenge using load balancing, multiple networks etc.
I also need to clone trafik/whoami to create the docker image that will be used in containers locally, and be able to use the compose application model.


2. Is this Dockerfile ready to be used in production?
We welcome any comments you canoffer regarding production readiness of this solution.

# DEVELOP ENVIROMENT
This means we're using minimal resources (4 containers), just to prove the concept
To Run in production is better to at least 2 frontends, and 6 containers, kubernetes deployments to prevent human erros, if rollback is needed
Will also be needed a public ip address, or exposing publicly via services. 
A firewall also is mandatory, as well existing networks integrations.
Https, CA and SSL configuration is required as well

Archtechture Model

image: ComposeModel.png
https://docs.docker.com/compose/compose-file/02-model/


#Houston we have a GO(Lang :-)  - Using docker compose to create load balancing port 80 between 3 dockerized images * And 1 FrontEnd

Please install git-scm and docker and compose before this Download and install, may be done follow this: https://docs.docker.com/compose/install/

1 - git clone this repo and cd to folder
https://github.com/JeffMuniz/GoLang-Api.git
cd golang-api

2 - Build image
docker build .

3 - Run containers load balancers and all requirements for developing
docker-compose up -d

4 - Test
curl <http://localhost>

* - Container running separately on port 80 WITHOUT docker-compose:
docker run -d -P --name golang traefik/whoami


What's going on here?
Deploy this GoLang API with functional requirements
WhoAmi is a Linux command that returns system variables such as the current user;
Trafik (https://github.com/traefik/whoami) wrote an API in Golang:
  - https://github.com/golang/go - Open source code maintained by the community
  - Derived from the original Go https://go.dev/ Code maintained by Google




# Personalizing your image
git clone https://github.com/traefik/whoami && cd whoami
docker login --username <you-docker-hub>

Tweak Dockerfile and save
docker build .  -t <you-docker-hub>:golang-web
docker push <you-docker-hub>:golang-web
docker-compose up -d



Documentation to Create docker-compose.yml
https://docs.docker.com/compose/compose-file/02-model/
https://docs.docker.com/compose/compose-file/deploy/
