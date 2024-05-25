# Define a imagem base
FROM postgres:13.3-alpine
# Copia o arquivo de inicialização personalizado
COPY init.sql /docker-entrypoint-initdb.d/

# Expõe a porta 80
EXPOSE 80

# Define a variável de ambiente com a porta a ser utilizada pelo PostgreSQL
ENV POSTGRES_PORT=80

# Define a variável de ambiente para desativar a solicitação de senha do PostgreSQL
ENV POSTGRES_HOST_AUTH_METHOD=trust

# Define a variável de ambiente com a senha do superusuário do PostgreSQL
ENV POSTGRES_PASSWORD=example_password

# Define a variável de ambiente com o nome do banco de dados a ser criado
ENV POSTGRES_DB=my_database

# Define o comando de inicialização do container
CMD ["postgres"]















FROM node:18-alpine 
# Installing libvips-dev for sharp Compatibility 
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev 
libpng-dev nasm bash vips-dev 
ARG NODE_ENV=development 
ENV NODE_ENV=${NODE_ENV} 
WORKDIR /opt/ 
COPY ./package.json ./yarn.lock ./ 
ENV PATH /opt/node_modules/.bin:$PATH 
RUN yarn config set network-timeout 600000 -g && yarn install 
WORKDIR /opt/app 
COPY ./ . 
RUN yarn build 
EXPOSE 1337 
CMD ["yarn", "develop"]

# Define a imagem base
FROM postgres:13.3-alpine

# Copia o arquivo de inicialização personalizado
COPY init.sql /docker-entrypoint-initdb.d/

# Expõe a porta 80
EXPOSE 80

# Define a variável de ambiente com a porta a ser utilizada pelo PostgreSQL
ENV POSTGRES_PORT=80

# Define a variável de ambiente para desativar a solicitação de senha do PostgreSQL
ENV POSTGRES_HOST_AUTH_METHOD=trust

# Define a variável de ambiente com a senha do superusuário do PostgreSQL
ENV POSTGRES_PASSWORD=example_password

# Define a variável de ambiente com o nome do banco de dados a ser criado
ENV POSTGRES_DB=my_database

# Define o comando de inicialização do container
CMD ["postgres"]




# Define a imagem base para o Postgres
FROM postgres:13.3-alpine

# Instala o OpenJDK 11
RUN apk add --no-cache openjdk11

# Define o diretório de trabalho
WORKDIR /usr/local

# Faz o download e extrai o Keycloak
RUN wget https://downloads.jboss.org/keycloak/14.0.0/keycloak-14.0.0.tar.gz && \
    tar -xzf keycloak-14.0.0.tar.gz && \
    rm keycloak-14.0.0.tar.gz

# Define as variáveis de ambiente para o Keycloak
ENV KEYCLOAK_HOME=/usr/local/keycloak-14.0.0
ENV KEYCLOAK_HTTP_PORT=8080
ENV KEYCLOAK_ADMIN_USER=admin
ENV KEYCLOAK_ADMIN_PASSWORD=admin

# Configura o Keycloak para o serviço Postgres
RUN ${KEYCLOAK_HOME}/bin/add-user-keycloak.sh -u postgres -p postgres

# Copia o arquivo de inicialização personalizado para o Postgres
COPY init.sql /docker-entrypoint-initdb.d/

# Expõe as portas do Keycloak e do Postgres
EXPOSE 8080 80

# Define o comando de inicialização do container
CMD ["sh", "-c", "${KEYCLOAK_HOME}/bin/standalone.sh -b 0.0.0.0 -Djboss.http.port=${KEYCLOAK_HTTP_PORT} & && postgres"]