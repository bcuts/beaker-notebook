(ns user
  (:require [hawk.core :as hawk]
            [environ.core :refer [env]]
            [bunsen.common.helper.utils :as u]
            [com.stuartsierra.component :as component]
            [clojure.tools.namespace.file :refer [read-file-ns-decl]]
            [clojure.tools.namespace.repl :refer [refresh refresh-all]]
            [bunsen.notebook.service :refer [service]]
            [datomic.api :as d]))

(def ^:dynamic *service*)

(def config
  {:allow-seed (:allow-seed env)
   :cookie-salt (:cookie-salt env)
   :seed-file (:notebook-seed-file env)
   :seed-readers {'file u/read-resource-file}
   :database-uri (:notebook-database-uri env)
   :jetty-options {:port 3003
                   :ssl? false
                   :join? false}})

(defn start []
  (alter-var-root #'*service*
                  (constantly
                    (component/start (service config)))))

(defn stop []
  (alter-var-root #'*service*
                  #(when % (component/stop %))))

(defn restart []
  (stop)
  (refresh :after 'user/start))

(defn watch []
  (start)
  (hawk/watch!
    [{:paths ["src"]
      :filter hawk/file?
      :handler (fn [_ {:keys [file]}]
                 (let [ns-sym (-> file read-file-ns-decl second)]
                   (require ns-sym :reload)
                   (println "reloaded namespace: " ns-sym)))}]))

(defn init []
  (watch))
