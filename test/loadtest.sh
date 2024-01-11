## Process: Run below once for each scenarios ##
# 1. elasticLogger disabled from env
# 2. elasticLogger enabled from env


# benchmark get requests
ab -n 2000 -c 10 -H 'logBody: true' http://localhost:8080/ping

# benchmark post requests
ab -n 2000 -c 10 -H 'logBody: true' -p post.data -T application/json http://localhost:8080/ping1

