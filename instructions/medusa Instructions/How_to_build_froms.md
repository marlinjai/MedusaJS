# 🛠️ Medusa.js Guide: Building Forms in the Admin Panel

In Medusa.js Admin, forms are built using **React**, **react-hook-form** for state management, and **Zod** for schema validation.

There are two main types of forms:

### 🆕 Create Forms — `FocusModal`

### ✏️ Edit Forms — `Drawer`

---

## ✅ Form Structure Overview

- **Validation Schema**: Define using `zod`
- **Form State**: Managed with `useForm` from `react-hook-form`
- **UI Components**: Use Medusa UI:
  `FocusModal`, `Drawer`, `FormProvider`, `Controller`, `Input`, `Label`, `Button`, `Heading`

---

## 🧪 Example: Create Form Using `FocusModal`

```tsx
import * as zod from 'zod';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { FocusModal, Label, Input, Button } from '@medusajs/ui';

const schema = zod.object({
  name: zod.string(),
});

export const CreateForm = () => {
  const form = useForm<zod.infer<typeof schema>>({
    defaultValues: { name: '' },
  });

  const handleSubmit = form.handleSubmit(({ name }) => {
    // TODO: Submit to backend
    console.log(name);
  });

  return (
    <FocusModal>
      <FocusModal.Trigger asChild>
        <Button>Create</Button>
      </FocusModal.Trigger>
      <FocusModal.Content>
        <FormProvider {...form}>
          <form onSubmit={handleSubmit}>
            <FocusModal.Header>
              <Button type="submit">Save</Button>
            </FocusModal.Header>
            <FocusModal.Body>
              <Controller
                control={form.control}
                name="name"
                render={({ field }) => (
                  <div>
                    <Label>Name</Label>
                    <Input {...field} />
                  </div>
                )}
              />
            </FocusModal.Body>
          </form>
        </FormProvider>
      </FocusModal.Content>
    </FocusModal>
  );
};
```

---

## ✏️ Example: Edit Form Using `Drawer`

```tsx
import * as zod from 'zod';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { Drawer, Label, Input, Button, Heading } from '@medusajs/ui';

const schema = zod.object({
  name: zod.string(),
});

export const EditForm = () => {
  const form = useForm<zod.infer<typeof schema>>({
    defaultValues: { name: '' },
  });

  const handleSubmit = form.handleSubmit(({ name }) => {
    // TODO: Submit to backend
    console.log(name);
  });

  return (
    <Drawer>
      <Drawer.Trigger asChild>
        <Button>Edit Item</Button>
      </Drawer.Trigger>
      <Drawer.Content>
        <FormProvider {...form}>
          <form onSubmit={handleSubmit}>
            <Drawer.Header>
              <Heading>Edit Item</Heading>
            </Drawer.Header>
            <Drawer.Body>
              <Controller
                control={form.control}
                name="name"
                render={({ field }) => (
                  <div>
                    <Label>Name</Label>
                    <Input {...field} />
                  </div>
                )}
              />
            </Drawer.Body>
            <Drawer.Footer>
              <Button type="submit">Save</Button>
            </Drawer.Footer>
          </form>
        </FormProvider>
      </Drawer.Content>
    </Drawer>
  );
};
```

---

## 📌 Notes

- Forms are typically custom-built per resource.
- `react-hook-form` and `zod` are included by default in Medusa Admin.
- For complex forms and reusable components, refer to the **Admin Components Guide**.
- See [Medusa Documentation](https://docs.medusajs.com/) for more details.
