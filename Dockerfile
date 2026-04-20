FROM ruby:4.0-alpine AS base
RUN apk add --no-cache build-base
WORKDIR /app

COPY Gemfile Gemfile.lock ./
RUN bundle config set without 'development test' \
    && bundle install --jobs 4

COPY . .

ENV PORT=8080
ENV RACK_ENV=production
EXPOSE 8080
CMD ["bundle", "exec", "puma", "-p", "8080", "-e", "production"]
