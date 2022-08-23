## Accurate Worker

Accurate Worker digunakan untuk background process ke Accurate (third-party integration) yang ditrigger dari Accurate Middleware

**Related service:**

-	[Accurate Middleware](https://bitbucket.org/forstok/accurate-middleware)

**Tech stack:**

-	NodeJS (16.14.0 LTS)
-	RabbitMQ
-	MongoDB

**Env:**

You can see the format in the `.env.example` file. For more detail please ask your coworkers.

**How to run in your local machine:**
-   Order Worker By Order Status
    -   Open (Create Sales Order to Accurate)
        ```
        npm run dev:open
        ```
    -   Cancelled (Close Sales Order in Accurate)
        ```
        npm run dev:cancel
        ```
    -   Ready to Shipped (Process Accurate Sales Order and create Sales Invoice)
        ```
        npm run dev:rts
        ```
    -   Delivered (Process Accurate Sales Order, set Sales Invoice status to Paid, and create Payment Receipt)
        ```
        npm run dev:delivered
        ```
-   Item Worker
    -   Filtering, Gathering, and Mapping
        ```
        npm run dev:filter
        ```
    -   Sync Item to Accurate
        ```
        npm run dev:import
        ```

**How to test your Unit Test file:**

Create your unit test file first then run following command:
```
npm run test
```

**Working with lint:**

To check your code style linter, run the following command:
```
npm run lint:check
```
To enforce the code style to be fixed, run the following command:
```
npm run linst:fix
```